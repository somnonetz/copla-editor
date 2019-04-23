import React, { Component } from 'react';
import {
  XYPlot,
  XAxis,
  YAxis,
  VerticalGridLines,
  HorizontalBarSeries,
  WhiskerSeries,
  DiscreteColorLegend,
} from 'react-vis';

import rawResults from './results.json';

import 'react-vis/dist/style.css';

const accSort = (a, b) => a - b;
// const avg = (arr, fn) => arr.reduce((s, obj) => s + fn(obj), 0) / arr.length;
const sum = (arr = []) => arr.reduce((a = 0, b = 0) => (+a) + (+b), 0); // parseInt('', 10) = NaN, (+'') = 0
const stanDev = (arr) => {
   const count = arr.length;
   const mean = sum(arr) / count;
   const result = arr.reduce((pv, cv) => pv + (cv - mean) ** 2, 0);
   return Math.sqrt(result / (count - 1));
};
const median = (arr) => arr.sort(accSort)[Math.floor((arr.length - 1) / 2)];
const pick = (arr, key) => arr.map(obj => obj[key]);
const filterResults = entry => true;
// const filterResults = entry => entry.testName === 'canvas-min-max' || entry.testName === 'svg-path-min-max';

const tests = Object.values(rawResults.filter(filterResults).reduce((result, entry) => {
  if (!result[entry.testName]) result[entry.testName] = { name: entry.testName, rows: {} };
  const rows = result[entry.testName].rows;
  if (!rows[entry.rows]) rows[entry.rows] = [];

  rows[entry.rows].push(entry);

  return result;
}, {}));

tests.forEach((test) => {
  const rows = Object.values(test.rows);
  test.rows = rows.map(entries => ({
    amount: entries[0].rows,
    scripting: median(pick(entries, 'scripting')),
    rendering: median(pick(entries, 'rendering')),
    painting: median(pick(entries, 'painting')),
    duration: median(pick(entries, 'duration')),
    ram: median(pick(entries, 'usedHeap')),
    stdDevCPU: stanDev(pick(entries, 'duration')),
    stdDevRAM: stanDev(pick(entries, 'usedHeap')),
  }));
});

const AMOUNTMAP = { 8: 0, 16: 1, 32: 2, 64: 3 };
const AMOUNTMAPREVERSE = { 0: 8, 1: 16, 2: 32, 3: 64 };
const COLORS = {
  scripting: '#f2d181', // '#c2a767',
  rendering: '#af99e9', // '#8c7bbb',
  painting: '#91c087', // '#749a6c',
};

const testNames = tests.map(t => t.name).reverse();
const testSize = testNames.length;
const range = 0.85;
const testTicks = Array.from(new Array(4)).flatMap((v, i) =>
  Array.from(new Array(testSize)).map((v, j) => (i - range / 2) + (range / testSize * j) + (range / (testSize * 2)))
);

console.log({ tests });

// const whiskers = tests.flatMap(t => t.rows).map((t, i) => {
const whiskers = Object.values(AMOUNTMAPREVERSE)
.flatMap(amount => tests.map(t => t.rows.find(c => c.amount === amount)).reverse())
.map((t, i) => ({
  y: testTicks[i],
  x: t.duration,
  xVariance: t.stdDevCPU,
  yVariance: 0, // 0.125
}));

class App extends Component {
  render() {
    return (
      <div className="App">
        <XYPlot width={900} height={450} stackBy="x" margin={{ bottom: 30, left: 220, right: 60, top: 10 }}>
          <DiscreteColorLegend
            style={{position: 'absolute', right: '56px', top: '10px'}}
            orientation="horizontal"
            items={[
              { title: 'Scripting', color: COLORS.scripting },
              { title: 'Rendering', color: COLORS.rendering },
              { title: 'Painting', color: COLORS.painting },
            ]}
          />
          <VerticalGridLines />

          {tests.flatMap(test => ['scripting', 'rendering', 'painting'].map(task =>
            <HorizontalBarSeries
              key={`${test.name}-${task}`}
              cluster={test.name}
              color={COLORS[task]}
              data={test.rows.map(row => ({ y: AMOUNTMAP[row.amount], x: row[task] }))}
            />
          ))}

          <WhiskerSeries color="black" data={whiskers} />

          <XAxis title="duration in ms" />
          <YAxis
            title="test name"
            tickValues={testTicks}
            tickFormat={d => testNames[testTicks.indexOf(d) % testSize]}
          />
          <YAxis
            left={-180}
            title="number of rows"
            tickValues={[0, 1, 2, 3]}
            tickFormat={d => AMOUNTMAPREVERSE[d]}
          />
        </XYPlot>
      </div>
    );
  }
}

export default App;
