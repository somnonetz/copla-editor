/* eslint-disable guard-for-in */
const bytes = require('bytes');
const puppeteer = require('puppeteer');

const tests = {
  small() {
    window.dates = Array.from(new Array(1000000)).map((val, i) => i);
  },
  big() {
    const now = Date.now();
    window.dates = Array.from(new Array(1000000)).map((val, i) => now + i);
  },
  date() {
    const now = Date.now();
    window.dates = Array.from(new Array(1000000)).map((val, i) => new Date(now + i));
  },
};

// Run Tests
(async () => {
  const browser = await puppeteer.launch();
  const usedHeaps = {};

  for (const testName in tests) {
    const page = await browser.newPage();
    const preHeap = (await page.metrics()).JSHeapUsedSize;
    await page.evaluate(tests[testName]);
    const postHeap = (await page.metrics()).JSHeapUsedSize;
    usedHeaps[testName] = postHeap - preHeap;
    await page.close();
    console.log(`${testName.padEnd(5, ' ')} used ${bytes(usedHeaps[testName]).padStart(8, ' ')}`);
  }

  compare('Date vs. Number', usedHeaps.date, usedHeaps.big);
  compare('Big vs. Small', usedHeaps.big, usedHeaps.small);
  await browser.close();
})();

function compare(label, a, b) {
  const diff = bytes(a - b);
  const ratio = (b / a * 100).toFixed(2);
  console.log(`${label}: Δ ${diff} / ${ratio}%`);
}
