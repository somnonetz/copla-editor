# EDF-Visualization using Web Worker and Windowing

[`react-window`](https://github.com/bvaughn/react-window) is used to create a virtualized list of EDF epochs. When an epoch is rendered, an `OffscreenCanvas` is generated and transfered to a web worker, which then draws randomly generated data on it. This offloads all compute intense work to the web worker, relieving the main thread, letting it run at 60fps.


## Usage

```
npm install
npm start
```
