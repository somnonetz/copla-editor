/* global self, importScripts */
/* eslint-disable guard-for-in, no-multi-spaces, no-restricted-globals */
const fs = require('fs');
const path = require('path');
const bytes = require('bytes');
const json2csv = require('json-2-csv');
const puppeteer = require('puppeteer');

const b = amount => bytes(amount, { fixedDecimals: true, unitSeparator: ' ' });
const round = num => Math.round(num * 1000) / 1000;
const testFile = `file:${path.join(__dirname, 'webworker-tests', 'index.html')}`;
const edfFiles = fs.readdirSync('edf-files').filter(file => file.endsWith('.edf'));
const edfScripts = [
  'EDF.js',                  // default
  'EDF-date.js',             // timestamps are Date objects
  'EDF-bigint.js',           // timestamps are absolute numbers
  'EDF-smis.js',             // timestamps are relative to `header.start`
  'EDF-no-empty-and-avg.js', // no empty min-max-array for freq:1, no avg, no nested array for min-max
  'EDF-separate-arrays.js',  // use seperate flat arrays for time, min, max (to have less arrays)
  'EDF-flat-array.js',       // use one flat array for a sequence of time, min, max
];

const tests = {
  // async load5Epochs(page) {
  //   const till = 5 * 30 * 1000;
  //   return page.evaluate(loadEdfData, { till });
  // },
  async load1MB(page, worker) { // INFO testing for MB is not precise as EDF uses blocks, so the real amount loaded might be more or less than defined
    const till = await getMsForMB(worker, 1);
    return page.evaluate(loadEdfData, { till });
  },
  async load10MB(page, worker) {
    const till = await getMsForMB(worker, 10);
    return page.evaluate(loadEdfData, { till });
  },
  // async load10MBFreq10(page, worker) {
  //   const till = await getMsForMB(worker, 10);
  //   return page.evaluate(loadEdfData, { till, frequency: 10 });
  // },
  async load10MBFreq40(page, worker) {
    const till = await getMsForMB(worker, 10);
    return page.evaluate(loadEdfData, { till, frequency: 40 });
  },
  // async load1HourFreq1(page) {
  //   const till = 120 * 30 * 1000; // 960 Epochs = 8 hours
  //   return page.evaluate(loadEdfData, { till, frequency: 1 });
  // },
};

(async () => {
  const testResults = [];
  const browser = await puppeteer.launch({
    // devtools: true,
    args: ['--allow-file-access-from-files'], // so the webworker can be loaded from `file://``
  });

  // TODO: run every test 100 times

  console.log(`${'edfScript'.padEnd(25)}${'edfFile'.padEnd(17)}${'testName'.padEnd(16)}${'diffRAM'.padStart(9)}  app<->worker`);

  for (const edfScript of edfScripts) {
    for (const edfFile of edfFiles) {
      for (const testName in tests) {
        const [page, worker] = await preparePage(browser, edfScript);
        await prepareFile(page, `edf-files/${edfFile}`);
        const startRAM = (await page.metrics()).JSHeapUsedSize;
        const result = await tests[testName](page, worker);
        const endRAM = (await page.metrics()).JSHeapUsedSize;
        const diffRAM = b(endRAM - startRAM);
        const measurements = await page.evaluate(() => window.measure.get());
        const receiveMS = `${measurements['receive-getData'].toFixed(1)} ms`;

        console.log(`${edfScript.padEnd(25)}${edfFile.padEnd(17)}${testName.padEnd(16)}${diffRAM.padStart(9)}${receiveMS.padStart(14)}`);

        testResults.push({
          edfScript,
          edfFile,
          testName,
          startRAM,
          endRAM,
          diffRAM,
          ...result,
          ...measurements,
        });

        await page.close();
      }
    }
  }

  writeResults(testResults);
  await browser.close();
})();

async function preparePage(browser, scriptUrl = 'EDF.js') {
  const page = await browser.newPage();
  await page.setUserAgent('puppeteer');
  // page.on('console', msg => console.log(msg.args().join(' ').replace(/JSHandle:/g, '')));
  await page.goto(testFile);
  const worker = await new Promise(resolve => page.once('workercreated', resolve));
  await worker.evaluate(script => importScripts(script), scriptUrl);
  return [page, worker];
}

async function prepareFile(page, filepath) {
  const input = await page.$('input');
  await input.uploadFile(filepath);
  await page.evaluate(async () => {
    const fileInput = document.querySelector('input');
    const file = fileInput.files[0];
    await window.callWorker('init', { file });
  });
}

async function loadEdfData(options = {}) {
  const start = performance.now();
  const data = await window.callWorker('getData', options);
  const duration = round(performance.now() - start);
  const dataPoints = Array.isArray(data[0])
    ? data.map(ar => ar.length).reduce((sum, val) => sum + val, 0)
    : data.length;
  return { dataPoints, duration };
}

async function getMsForMB(worker, MBtoLoad = 1) {
  return worker.evaluate((MB) => {
    const { header } = self.edf;
    const blocksToLoad = Math.round(1000000 * MB / (header.recordSize * 2));
    const till = blocksToLoad * header.recordDurationTime * 1000;
    // console.log(`load ${MB}: ${blocksToLoad} blocks, ${till / 1000} s`);
    return till;
  }, MBtoLoad);
}

async function writeResults(results) {
  const timestamp = new Date().toISOString().slice(0, -5).replace(/[T:]/g, '-');
  const filename = `results/worker-${timestamp}.csv`;
  const csv = await json2csv.json2csvAsync(results);
  fs.writeFileSync(filename, csv);
  console.log('Results saved to', filename);
}
