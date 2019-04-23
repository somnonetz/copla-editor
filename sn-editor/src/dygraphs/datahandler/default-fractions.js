/* eslint-disable */

/**
 * @license
 * Copyright 2013 David Eberlein (david.eberlein@ch.sauter-bc.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/**
 * @fileoverview DataHandler implementation for the fractions option.
 * @author David Eberlein (david.eberlein@ch.sauter-bc.com)
 */

/* global Dygraph:false */


import DygraphDataHandler from './datahandler';
import DefaultHandler from './default';

/**
 * @extends DefaultHandler
 * @constructor
 */
class DefaultFractionHandler extends DefaultHandler {
   extractSeries(rawData, i, options) {
      // TODO(danvk): pre-allocate series here.
      const series = [];
      let x;
      let y;
      let point;
      let num;
      let den;
      let value;
      const mult = 100.0;
      const logScale = options.get('logscale');
      for (let j = 0; j < rawData.length; j++) {
         x = rawData[j][0];
         point = rawData[j][i];
         if (logScale && point !== null) {
         // On the log scale, points less than zero do not exist.
         // This will create a gap in the chart.
            if (point[0] <= 0 || point[1] <= 0) {
               point = null;
            }
         }
         // Extract to the unified data format.
         if (point !== null) {
            num = point[0];
            den = point[1];
            if (num !== null && !isNaN(num)) {
               value = den ? num / den : 0.0;
               y = mult * value;
               // preserve original values in extras for further filtering
               series.push([x, y, [num, den]]);
            }
            else {
               series.push([x, num, [num, den]]);
            }
         }
         else {
            series.push([x, null, [null, null]]);
         }
      }
      return series;
   }

   rollingAverage(originalData, rollPeriod, options) {
      rollPeriod = Math.min(rollPeriod, originalData.length);
      const rollingData = [];

      let i;
      let num = 0;
      let den = 0; // numerator/denominator
      const mult = 100.0;
      for (i = 0; i < originalData.length; i++) {
         num += originalData[i][2][0];
         den += originalData[i][2][1];
         if (i - rollPeriod >= 0) {
            num -= originalData[i - rollPeriod][2][0];
            den -= originalData[i - rollPeriod][2][1];
         }

         const date = originalData[i][0];
         const value = den ? num / den : 0.0;
         rollingData[i] = [date, mult * value];
      }

      return rollingData;
   }
}

export default DefaultFractionHandler;
