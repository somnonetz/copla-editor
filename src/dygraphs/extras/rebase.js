/**
 * @license
 * Copyright 2015 Petr Shevtsov (petr.shevtsov@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 *
 * Rebase plugin
 *
 * On pan/zoom event, each series will rebase to a specified value (e.g. 100) at the
 * start of the displayed period.
 *
 * See http://stats.oecd.org/glossary/detail.asp?ID=2249
 *
 * Options:
 *  Value to rebase. Must be either Number or 'percent' or null.
 *
 * See tests/straw-broom.html for demo.
 */

/* global Dygraph:false */

(function () {


  // Matches DefaultHandler.parseFloat
  const parseFloat = function (val) {
    if (val === null) return NaN;
    return val;
  };

  Dygraph.DataHandlers.RebaseHandler = function (baseOpt) {
    this.baseOpt = baseOpt;
  };

  const RebaseHandler = Dygraph.DataHandlers.RebaseHandler;
  RebaseHandler.prototype = new Dygraph.DataHandlers.DefaultHandler();

  RebaseHandler.rebase = function (value, initial, base) {
    if (base === 'percent') {
      return (value / initial - 1) * 100;
    }
    return value * base / initial;
  };

  RebaseHandler.prototype.getExtremeYValues = function (series, dateWindow, options) {
    let minY = null;
    let maxY = null;
    let y;
    const firstIdx = 0;
    const lastIdx = series.length - 1;
    const initial = series[firstIdx][1];

    for (let j = firstIdx; j <= lastIdx; j++) {
      if (j === firstIdx) {
        y = (this.baseOpt === 'percent') ? 0 : this.baseOpt;
      }
      else {
        y = RebaseHandler.rebase(series[j][1], initial, this.baseOpt);
      }
      if (y === null || isNaN(y)) { continue; }
      if (maxY === null || y > maxY) {
        maxY = y;
      }
      if (minY === null || y < minY) {
        minY = y;
      }
    }
    return [minY, maxY];
  };

  RebaseHandler.prototype.seriesToPoints = function (series, setName, boundaryIdStart) {
    const points = [];
    const firstIdx = 0;
    const lastIdx = series.length - 1;
    const initial = series[firstIdx][1]; // TODO: check for null
    for (let i = 0; i <= lastIdx; ++i) {
      const item = series[i];
      const yraw = item[1];
      let yval = yraw === null ? null : parseFloat(yraw);
      if (yval !== null) {
        if (i === firstIdx) {
          yval = (this.baseOpt === 'percent') ? 0 : this.baseOpt;
        }
        else {
          yval = RebaseHandler.rebase(yval, initial, this.baseOpt);
        }
      }
      const point = {
        x: NaN,
        y: NaN,
        xval: parseFloat(item[0]),
        yval,
        name: setName,
        idx: i + boundaryIdStart,
      };
      points.push(point);
    }
    this.onPointsCreated_(series, points);
    return points;
  };

  Dygraph.Plugins.Rebase = (function () {
    class rebase {
      constructor(baseOpt) {
        const isNum = function (v) {
          return !isNaN(v) && (typeof v === 'number' || {}.toString.call(v) === '[object Number]');
        };
        if (baseOpt === 'percent' || isNum(baseOpt)) {
          this.baseOpt_ = baseOpt;
        }
        else {
          this.baseOpt_ = null;
        }
      }

      toString() {
        return 'Rebase Plugin';
      }

      activate(g) {
        if (this.baseOpt_ === null) {
          return;
        }
        return {
          predraw: this.predraw,
        };
      }

      predraw(e) {
        const g = e.dygraph;

        if (this.baseOpt_ === 'percent') {
          g.updateOptions({
            axes: {
              y: {
                axisLabelFormatter(y) {
                  return `${y}%`;
                },
                valueFormatter(y) {
                  return `${Math.round(y * 100) / 100}%`;
                },
              },
            },
          }, true);
        }

        g.dataHandler_ = new Dygraph.DataHandlers.RebaseHandler(this.baseOpt_);
      }
    }

    return rebase;
  }());
}());
