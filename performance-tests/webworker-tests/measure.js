const temp = {};
const measurements = {};
const round = num => Math.round(num * 1000) / 1000;

window.measure = {
  start(name) {
    temp[name] = performance.now();
  },
  stop(name) {
    measurements[name] = round(performance.now() - temp[name]);
    delete temp[name];
  },
  log(name, value) {
    measurements[name] = value;
  },
  get() {
    return measurements;
  },
};
