let numberOfDraws;
let resolvePromise;

function startTest(n = 10) {
  return new Promise((resolve) => {
    resolvePromise = resolve;
    numberOfDraws = n;
    queue(measure);
  });
}

function measure() {
  window.draw();
  queue(numberOfDraws-- ? measure : resolvePromise);
}

function queue(fn) {
  // setTimeout(fn);
  // window.requestIdleCallback(fn);
  window.requestAnimationFrame(fn);
}
