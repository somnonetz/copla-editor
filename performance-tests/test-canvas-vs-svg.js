const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { parseObject } = require('chrome-trace');

const windowWidth = 1200;
const windowHeight = 800;
const numberOfRows = [8, 16, 32, 64];
const numberOfRuns = 10;
const numberOfDraws = 100;

const traceCategories = [
  'blink.console',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'toplevel',
  'disabled-by-default-devtools.timeline.frame',
];
const columns = ['rows', 'run', 'testName', 'scripting', 'rendering', 'painting', 'duration', 'usedHeap'];
const results = [];
const getTestURL = testName => `file:${path.join(__dirname, 'canvas-vs-svg-tests', `${testName}.html`)}`;
const tests = fs.readdirSync('canvas-vs-svg-tests')
  .filter(file => file.endsWith('.html'))
  .map(file => file.replace(/\.html$/, ''));
const round = num => Math.round(num * 1000) / 1000;

// Run Tests
(async () => {
  const browser = await puppeteer.launch({
    defaultViewport: { width: windowWidth, height: windowHeight },
    args: ['--use-gl=desktop'],
  });

  // Rows > Runs > Test
  for (const rows of numberOfRows) {
    console.log('use', rows, 'rows');
    for (let run = 0; run < numberOfRuns; run++) {
      console.log('\tstart run', run);
      for (const testName of tests) {
        console.log('\t\tstart test', testName);
        const page = await browser.newPage();
        const url = getTestURL(testName);
        await page.goto(url);
        const preHeap = (await page.metrics()).JSHeapUsedSize;
        await page.evaluate(`setupTest({ numberOfRows: ${rows}})`);
        // uncomment to save trace file
        // await page.tracing.start({ path: `results/${testName}-${run}.json`, categories: traceCategories });
        await page.tracing.start({ categories: traceCategories });
        await page.evaluate(`startTest(${numberOfDraws})`);
        const traceBuffer = await page.tracing.stop();
        const postHeap = (await page.metrics()).JSHeapUsedSize;
        const usedHeap = postHeap - preHeap;
        addToResults([rows, run, testName], traceBuffer, usedHeap);
        await page.close();
      }
    }
  }

  await browser.close();
  writeResults();
})();

function addToResults(meta, traceBuffer, usedHeap) {
  const trace = traceBuffer.toString('utf8');
  const json = JSON.parse(trace);
  try {
    const result = parseObject(json);
    const mainThread = Object.keys(result.threadName).find(key => result.threadName[key] === 'CrRendererMain');
    const eventTypeTime = result.eventTypeTime[mainThread];
    const { Scripting, Rendering, Painting } = result.eventCategoryTime[mainThread];
    const cleanScripting = Scripting - eventTypeTime.EvaluateScript; // remove EvaluateScript as it's because of puppeteer
    const duration = cleanScripting + Rendering + Painting;
    results.push([...meta, ...[cleanScripting, Rendering, Painting, duration].map(round), usedHeap]);
  }
  catch (error) {
    console.error(error);
    const timestamp = new Date().toISOString().slice(0, -5).replace(/[T:]/g, '-');
    fs.writeFileSync(`error-${timestamp}.json`, json);
  }
}

function writeResults() {
  const timestamp = new Date().toISOString().slice(0, -5).replace(/[T:]/g, '-');
  const filename = `results/${numberOfRuns}-runs-${numberOfDraws}-draws-${timestamp}.csv`;
  const csv = [columns, ...results].map(row => row.join(',')).join('\n');
  fs.writeFileSync(filename, csv);
  console.log('Results saved to', filename);
}
