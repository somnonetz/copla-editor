const fs = require('fs');
const path = require('path');
const json2csv = require('json-2-csv');
const puppeteer = require('puppeteer');

const round = num => Math.round(+num * 1000) / 1000;
const testFile = `file:${path.join(__dirname, 'worker-imagedata-tests', 'index.html')}`;
const keys = ['main-requestImage', 'main-receive', 'main-putImageData', 'worker-render', 'worker-transfer'];
const numberOfRuns = 100;
const results = [{}];

(async () => {
  console.log(`starting ${numberOfRuns} runs`);

  const browser = await puppeteer.launch({
    // devtools: true,
    defaultViewport: { width: 1200, height: 800 },
    args: ['--allow-file-access-from-files'], // so the webworker can be loaded from `file://``
  });

  const page = await browser.newPage();
  // page.on('console', msg => console.log(msg.args().join(' ').replace(/JSHandle:/g, '')));
  page.on('console', log);
  await page.goto(testFile);
  // const worker = await new Promise(resolve => page.once('workercreated', resolve));
  await new Promise(resolve => page.once('workercreated', resolve));

  const duration = await page.evaluate(async (n) => {
    const start = performance.now();
    for (let i = 0; i < n; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      await window.requestImage();
    }
    return performance.now() - start;
  }, numberOfRuns);

  console.log(`finished in ${duration.toFixed(2)} ms`);
  results.pop(); // last result is empty
  writeResults();

  await page.close();
  await browser.close();

})();

function log(event) {
  const message = event.args().join();
  const pattern = /JSHandle:(?<key>[\w-]+): (?<value>[\d.]+)ms/;
  const { key, value } = pattern.exec(message).groups;
  const index = results.length - 1;
  results[index][key] = round(value);
  if (key === keys[0]) results.push({});
}

async function writeResults() {
  const timestamp = new Date().toISOString().slice(0, -5).replace(/[T:]/g, '-');
  const filename = `results/imagedata-${timestamp}.csv`;
  const csv = await json2csv.json2csvAsync(results, { keys });
  fs.writeFileSync(filename, csv);
  console.log('Results saved to', filename);
}
