# Performance Tests

1. Install the dependencies with `npm install`.
2. Add EDF files to the "edf-files" directory – these will be used to e.g. test the parsing performance.
3. Run the tests.
   ```sh
   node test-canvas-vs-svg
   node test-date-ram-usage
   node test-edf
   node test-webworker-edf-data
   node test-worker-imagedata
   node test-queues
   ```

- **test-canvas-vs-svg**: Test the performance difference between SVG and Canvas. All tests reside in `tests`. Each test has to include `test-basis.js` and implement a `draw` function.
- **test-date-ram-usage**: Test the RAM usage difference for Numbers and Date objects.
- **test-edf**: Test how long it takes to parse raw EDF data into different data structures and how much RAM they use.
- **test-webworker-edf-data**: Test how long it takes to parse raw EDF in a Web Worker and transfer the result to the main thread.
- **test-worker-imagedata**: Test how long it takes to calculate `ImageData` for a canvas in a Web Worker and transfer them to the main thread.
- **test-queues**: Test how much different queueing methods (`setTimeout`, `requestIdleCallback`, `requestAnimationFrame`) waste on idle.


## Results

Relevant events:

| Event       | Description  |
| ----------- | ------------ |
| `rows`      | Number of Signals / Channels plotted |
| `run`       | Number of the run (tests might be run multiple times) |
| `testName`  | Name of the test (basically the filename) |
| `scripting` | Time spent on `scripting` |
| `rendering` | Time spent on `rendering` |
| `painting`  | Time spent on `painting` |
| `duration`  | The overall duration (sum of the above three) |
| `usedHeap`  | Bytes of RAM occupied by the test |


## Further Links

- [paulirish/automated-chrome-profiling](https://github.com/paulirish/automated-chrome-profiling)
- [The Trace Event Profiling Tool (about:tracing)](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool)
- [Trace-Viewer – the JavaScript frontend for Chromes about:tracing](https://github.com/catapult-project/catapult/tree/master/tracing)
- [Chromiums Trace Event Mapping (TimelineModel.TimelineModel.RecordType)](https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/timeline_model/TimelineModel.js?type=cs&q=TimelineModel.js&sq=package:chromium&l=1167-1310)
- [The Trace Event Format](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit)
- [Puppeteer API](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md)
