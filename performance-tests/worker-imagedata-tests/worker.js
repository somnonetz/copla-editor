/* eslint-disable no-restricted-globals */
let length;
let imageData;
let canvasnoisedata;

self.onmessage = ({ data }) => {
  if (!imageData) setUp(data);
  else render();
};

function setUp({ width, height }) {
  length = width * height * 4;
  imageData = new ImageData(width, height);
  canvasnoisedata = new Uint32Array(length);
}

function render() {
  console.time('worker-render');
  for (let i = 0; i < length; i += 4) {
    const rand = Math.floor(Math.random() * 255);
    canvasnoisedata[i] = rand; // red
    canvasnoisedata[i + 1] = rand; // green
    canvasnoisedata[i + 2] = rand; // blue
    canvasnoisedata[i + 3] = 255; // alpha
  }
  imageData.data.set(canvasnoisedata);
  console.timeEnd('worker-render');
  console.time('worker-transfer');
  postMessage({ imageData });
  console.timeEnd('worker-transfer');
}
