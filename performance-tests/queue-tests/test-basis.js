window.queueFn = window.requestAnimationFrame;
let numberOfDraws;
let resolvePromise;
let start;

function finish() {
  const duration = performance.now() - start;
  resolvePromise(duration);
}

function startTest(n = 10) {
  return new Promise((resolve) => {
    resolvePromise = resolve;
    numberOfDraws = n;
    start = performance.now();
    queue(measure);
  });
}

function measure() {
  window.draw();
  queue(numberOfDraws-- ? measure : finish);
}

function queue(fn) {
  // setTimeout(fn);
  // window.requestIdleCallback(fn);
  // window.requestAnimationFrame(fn);
  window.queueFn(fn);
}
