/**
 * @license
 * Copyright 2013 David Eberlein (david.eberlein@ch.sauter-bc.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/**
 * @fileoverview DataHandler base implementation for the "bar"
 * data formats. This implementation must be extended and the
 * extractSeries and rollingAverage must be implemented.
 * @author David Eberlein (david.eberlein@ch.sauter-bc.com)
 */


import DygraphDataHandler from './datahandler';
import DygraphLayout from '../dygraph-layout';

/**
 * @constructor
 * @extends {Dygraph.DataHandler}
 */
class BarsHandler extends DygraphDataHandler {

  // TODO(danvk): figure out why the jsdoc has to be copy/pasted from superclass.
  //   (I get closure compiler errors if this isn't here.)
  /**
    * @override
    * @param {!Array.<Array>} rawData The raw data passed into dygraphs where
    *     rawData[i] = [x,ySeries1,...,ySeriesN].
    * @param {!number} seriesIndex Index of the series to extract. All other
    *     series should be ignored.
    * @param {!DygraphOptions} options Dygraph options.
    * @return {Array.<[!number,?number,?]>} The series in the unified data format
    *     where series[i] = [x,y,{extras}].
    */
  extractSeries(rawData, seriesIndex, options) {
    // Not implemented here must be extended
  }

  /**
    * @override
    * @param {!Array.<[!number,?number,?]>} series The series in the unified
    *          data format where series[i] = [x,y,{extras}].
    * @param {!number} rollPeriod The number of points over which to average the data
    * @param {!DygraphOptions} options The dygraph options.
    * TODO(danvk): be more specific than "Array" here.
    * @return {!Array.<[!number,?number,?]>} the rolled series.
    */
  rollingAverage(series, rollPeriod, options) {
    // Not implemented here, must be extended.
  }

  /** @inheritDoc */
  onPointsCreated_(series, points) {
    for (let i = 0; i < series.length; ++i) {
      const item = series[i];
      const point = points[i];
      point.y_top = NaN;
      point.y_bottom = NaN;
      point.yval_minus = DygraphDataHandler.parseFloat(item[2][0]);
      point.yval_plus = DygraphDataHandler.parseFloat(item[2][1]);
    }
  }

  /** @inheritDoc */
  getExtremeYValues(series, dateWindow, options) {
    let minY = null;
    let maxY = null;
    let y;

    const firstIdx = 0;
    const lastIdx = series.length - 1;

    for (let j = firstIdx; j <= lastIdx; j++) {
      y = series[j][1];
      if (y === null || isNaN(y)) continue;

      let low = series[j][2][0];
      let high = series[j][2][1];

      if (low > y) low = y; // this can happen with custom bars,
      if (high < y) high = y; // e.g. in tests/custom-bars.html

      if (maxY === null || high > maxY) maxY = high;
      if (minY === null || low < minY) minY = low;
    }

    return [minY, maxY];
  }

  /** @inheritDoc */
  onLineEvaluated(points, axis, logscale) {
    let point;
    for (let j = 0; j < points.length; j++) {
      // Copy over the error terms
      point = points[j];
      point.y_top = DygraphLayout.calcYNormal_(axis, point.yval_minus, logscale);
      point.y_bottom = DygraphLayout.calcYNormal_(axis, point.yval_plus, logscale);
    }
  }
}

export default BarsHandler;
