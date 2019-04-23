/* eslint-disable */

/**
 * @license
 * Copyright 2006 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/**
 * @fileoverview Based on PlotKit.CanvasRenderer, but modified to meet the
 * needs of dygraphs.
 *
 * In particular, support for:
 * - grid overlays
 * - error bars
 * - dygraphs attribute system
 */

/**
 * The DygraphCanvasRenderer class does the actual rendering of the chart onto
 * a canvas. It's based on PlotKit.CanvasRenderer.
 * @param {Object} element The canvas to attach to
 * @param {Object} elementContext The 2d context of the canvas (injected so it
 * can be mocked for testing.)
 * @param {Layout} layout The DygraphLayout object for this graph.
 * @constructor
 */

/* global Dygraph:false */


import * as utils from './dygraph-utils';
import Dygraph from './dygraph';


/**
 * @constructor
 *
 * This gets called when there are "new points" to chart. This is generally the
 * case when the underlying data being charted has changed. It is _not_ called
 * in the common case that the user has zoomed or is panning the view.
 *
 * The chart canvas has already been created by the Dygraph object. The
 * renderer simply gets a drawing context.
 *
 * @param {Dygraph} dygraph The chart to which this renderer belongs.
 * @param {HTMLCanvasElement} element The &lt;canvas&gt; DOM element on which to draw.
 * @param {CanvasRenderingContext2D} elementContext The drawing context.
 * @param {DygraphLayout} layout The chart's DygraphLayout object.
 *
 * TODO(danvk): remove the elementContext property.
 */
class DygraphCanvasRenderer {
   constructor(dygraph, element, elementContext, layout) {
      this.dygraph_ = dygraph;

      this.layout = layout;
      this.element = element;
      this.elementContext = elementContext;

      this.height = dygraph.height_;
      this.width = dygraph.width_;

      // --- check whether everything is ok before we return
      if (!utils.isCanvasSupported(this.element)) {
         throw 'Canvas is not supported.';
      }

      // internal state
      this.area = layout.getPlotArea();

      // Set up a clipping area for the canvas (and the interaction canvas).
      // This ensures that we don't overdraw.
      let ctx = this.dygraph_.canvas_ctx_;
      ctx.beginPath();
      ctx.rect(this.area.x, this.area.y, this.area.w, this.area.h);
      ctx.clip();

      ctx = this.dygraph_.hidden_ctx_;
      ctx.beginPath();
      ctx.rect(this.area.x, this.area.y, this.area.w, this.area.h);
      ctx.clip();
   }

   /**
    * Clears out all chart content and DOM elements.
    * This is called immediately before render() on every frame, including
    * during zooms and pans.
    * @private
    */
   clear() {
      this.elementContext.clearRect(0, 0, this.width, this.height);
   }

   /**
    * This method is responsible for drawing everything on the chart, including
    * lines, error bars, fills and axes.
    * It is called immediately after clear() on every frame, including during pans
    * and zooms.
    * @private
    */
   render() {
      // attaches point.canvas{x,y}
      this._updatePoints();

      // actually draws the chart.
      this._renderLineChart();
   }

   /**
    * Returns a predicate to be used with an iterator, which will
    * iterate over points appropriately, depending on whether
    * connectSeparatedPoints is true. When it's false, the predicate will
    * skip over points with missing yVals.
    */
   static _getIteratorPredicate(connectSeparatedPoints) {
      return connectSeparatedPoints ?
         DygraphCanvasRenderer._predicateThatSkipsEmptyPoints :
         null;
   }

   static _predicateThatSkipsEmptyPoints(array, idx) {
      return array[idx].yval !== null;
   }

   /**
    * Draws a line with the styles passed in and calls all the drawPointCallbacks.
    * @param {Object} e The dictionary passed to the plotter function.
    * @private
    */
   static _drawStyledLine(
      e,
      color,
      strokeWidth,
      strokePattern,
      drawPoints,
      drawPointCallback,
      pointSize,
   ) {
      const g = e.dygraph;
      // TODO(konigsberg): Compute attributes outside this method call.
      const stepPlot = g.getBooleanOption('stepPlot', e.setName);

      if (!utils.isArrayLike(strokePattern)) {
         strokePattern = null;
      }

      const drawGapPoints = g.getBooleanOption('drawGapEdgePoints', e.setName);

      const points = e.points;
      const setName = e.setName;
      const iter = utils.createIterator(points, 0, points.length,
         DygraphCanvasRenderer._getIteratorPredicate(
            g.getBooleanOption('connectSeparatedPoints', setName)));

      const stroking = strokePattern && (strokePattern.length >= 2);

      const ctx = e.drawingContext;
      ctx.save();
      if (stroking) {
         if (ctx.setLineDash) ctx.setLineDash(strokePattern);
      }

      const pointsOnLine = DygraphCanvasRenderer._drawSeries(
         e, iter, strokeWidth, pointSize, drawPoints, drawGapPoints, stepPlot, color);
      DygraphCanvasRenderer._drawPointsOnLine(
         e, pointsOnLine, drawPointCallback, color, pointSize);

      if (stroking) {
         if (ctx.setLineDash) ctx.setLineDash([]);
      }

      ctx.restore();
   }

   /**
    * This does the actual drawing of lines on the canvas, for just one series.
    * Returns a list of [canvasx, canvasy] pairs for points for which a
    * drawPointCallback should be fired.  These include isolated points, or all
    * points if drawPoints=true.
    * @param {Object} e The dictionary passed to the plotter function.
    * @private
    */
   static _drawSeries(
      e,
      iter,
      strokeWidth,
      pointSize,
      drawPoints,
      drawGapPoints,
      stepPlot,
      color,
   ) {

      let prevCanvasX = null;
      let prevCanvasY = null;
      let nextCanvasY = null;
      let isIsolated; // true if this point is isolated (no line segments)
      let point; // the point being processed in the while loop
      const pointsOnLine = []; // Array of [canvasx, canvasy] pairs.
      let first = true; // the first cycle through the while loop

      const ctx = e.drawingContext;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;

      // NOTE: we break the iterator's encapsulation here for about a 25% speedup.
      const arr = iter.array_;
      const limit = iter.end_;
      const predicate = iter.predicate_;

      for (let i = iter.start_; i < limit; i++) {
         point = arr[i];
         if (predicate) {
            while (i < limit && !predicate(arr, i)) {
               i++;
            }
            if (i == limit) break;
            point = arr[i];
         }

         // FIXME: The 'canvasy != canvasy' test here catches NaN values but the test
         // doesn't catch Infinity values. Could change this to
         // !isFinite(point.canvasy), but I assume it avoids isNaN for performance?
         if (point.canvasy === null || point.canvasy != point.canvasy) {
            if (stepPlot && prevCanvasX !== null) {
               // Draw a horizontal line to the start of the missing data
               ctx.moveTo(prevCanvasX, prevCanvasY);
               ctx.lineTo(point.canvasx, prevCanvasY);
            }
            prevCanvasX = prevCanvasY = null;
         }
         else {
            isIsolated = false;
            if (drawGapPoints || prevCanvasX === null) {
               iter.nextIdx_ = i;
               iter.next();
               nextCanvasY = iter.hasNext ? iter.peek.canvasy : null;

               const isNextCanvasYNullOrNaN = nextCanvasY === null ||
               nextCanvasY != nextCanvasY;
               isIsolated = (prevCanvasX === null && isNextCanvasYNullOrNaN);
               if (drawGapPoints) {
                  // Also consider a point to be "isolated" if it's adjacent to a
                  // null point, excluding the graph edges.
                  if ((!first && prevCanvasX === null) ||
                 (iter.hasNext && isNextCanvasYNullOrNaN)) {
                     isIsolated = true;
                  }
               }
            }

            if (prevCanvasX !== null) {
               if (strokeWidth) {
                  if (stepPlot) {
                     ctx.moveTo(prevCanvasX, prevCanvasY);
                     ctx.lineTo(point.canvasx, prevCanvasY);
                  }

                  ctx.lineTo(point.canvasx, point.canvasy);
               }
            }
            else {
               ctx.moveTo(point.canvasx, point.canvasy);
            }
            if (drawPoints || isIsolated) {
               pointsOnLine.push([point.canvasx, point.canvasy, point.idx]);
            }
            prevCanvasX = point.canvasx;
            prevCanvasY = point.canvasy;
         }
         first = false;
      }
      ctx.stroke();
      return pointsOnLine;
   }

   /**
    * This fires the drawPointCallback functions, which draw dots on the points by
    * default. This gets used when the "drawPoints" option is set, or when there
    * are isolated points.
    * @param {Object} e The dictionary passed to the plotter function.
    * @private
    */
   static _drawPointsOnLine(e, pointsOnLine, drawPointCallback, color, pointSize) {
      const ctx = e.drawingContext;
      for (let idx = 0; idx < pointsOnLine.length; idx++) {
         const cb = pointsOnLine[idx];
         ctx.save();
         drawPointCallback.call(e.dygraph,
            e.dygraph, e.setName, ctx, cb[0], cb[1], color, pointSize, cb[2]);
         ctx.restore();
      }
   }

   /**
    * Attaches canvas coordinates to the points array.
    * @private
    */
   _updatePoints() {
      // Update Points
      // TODO(danvk): here
      //
      // TODO(bhs): this loop is a hot-spot for high-point-count charts. These
      // transformations can be pushed into the canvas via linear transformation
      // matrices.
      // NOTE(danvk): this is trickier than it sounds at first. The transformation
      // needs to be done before the .moveTo() and .lineTo() calls, but must be
      // undone before the .stroke() call to ensure that the stroke width is
      // unaffected.  An alternative is to reduce the stroke width in the
      // transformed coordinate space, but you can't specify different values for
      // each dimension (as you can with .scale()). The speedup here is ~12%.
      const sets = this.layout.points;
      for (let i = sets.length; i--;) {
         const points = sets[i];
         for (let j = points.length; j--;) {
            const point = points[j];
            point.canvasx = this.area.w * point.x + this.area.x;
            point.canvasy = this.area.h * point.y + this.area.y;
         }
      }
   }

   /**
    * Add canvas Actually draw the lines chart, including error bars.
    *
    * This function can only be called if DygraphLayout's points array has been
    * updated with canvas{x,y} attributes, i.e. by
    * DygraphCanvasRenderer._updatePoints.
    *
    * @param {string=} opt_seriesName when specified, only that series will
    *     be drawn. (This is used for expedited redrawing with highlightSeriesOpts)
    * @param {CanvasRenderingContext2D} opt_ctx when specified, the drawing
    *     context.  However, lines are typically drawn on the object's
    *     elementContext.
    * @private
    */
   _renderLineChart(opt_seriesName, opt_ctx) {
      const ctx = opt_ctx || this.elementContext;
      let i;

      const sets = this.layout.points;
      const setNames = this.layout.setNames;
      let setName;

      this.colors = this.dygraph_.colorsMap_;

      // Determine which series have specialized plotters.
      const plotter_attr = this.dygraph_.getOption('plotter');
      let plotters = plotter_attr;
      if (!utils.isArrayLike(plotters)) {
         plotters = [plotters];
      }

      const setPlotters = {}; // series name -> plotter fn.
      for (i = 0; i < setNames.length; i++) {
         setName = setNames[i];
         const setPlotter = this.dygraph_.getOption('plotter', setName);
         if (setPlotter == plotter_attr) continue; // not specialized.

         setPlotters[setName] = setPlotter;
      }

      for (i = 0; i < plotters.length; i++) {
         const plotter = plotters[i];
         const is_last = (i == plotters.length - 1);

         for (let j = 0; j < sets.length; j++) {
            setName = setNames[j];
            if (opt_seriesName && setName != opt_seriesName) continue;

            const points = sets[j];

            // Only throw in the specialized plotters on the last iteration.
            let p = plotter;
            if (setName in setPlotters) {
               if (is_last) {
                  p = setPlotters[setName];
               }
               else {
                  // Don't use the standard plotters in this case.
                  continue;
               }
            }

            const color = this.colors[setName];
            const strokeWidth = this.dygraph_.getOption('strokeWidth', setName);

            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            p({
               points,
               setName,
               drawingContext: ctx,
               color,
               strokeWidth,
               dygraph: this.dygraph_,
               axis: this.dygraph_.axisPropertiesForSeries(setName),
               plotArea: this.area,
               seriesIndex: j,
               seriesCount: sets.length,
               singleSeriesName: opt_seriesName,
               allSeriesPoints: sets,
            });
            ctx.restore();
         }
      }
   }

   /**
    * Plotter which draws the central lines for a series.
    * @private
    */
   static _linePlotter(e) {
      const g = e.dygraph;
      const setName = e.setName;
      const strokeWidth = e.strokeWidth;

      // TODO(danvk): Check if there's any performance impact of just calling
      // getOption() inside of _drawStyledLine. Passing in so many parameters makes
      // this code a bit nasty.
      const borderWidth = g.getNumericOption('strokeBorderWidth', setName);
      const drawPointCallback = g.getOption('drawPointCallback', setName) ||
         utils.Circles.DEFAULT;
      const strokePattern = g.getOption('strokePattern', setName);
      const drawPoints = g.getBooleanOption('drawPoints', setName);
      const pointSize = g.getNumericOption('pointSize', setName);

      if (borderWidth && strokeWidth) {
         DygraphCanvasRenderer._drawStyledLine(e,
            g.getOption('strokeBorderColor', setName),
            strokeWidth + 2 * borderWidth,
            strokePattern,
            drawPoints,
            drawPointCallback,
            pointSize,
         );
      }

      DygraphCanvasRenderer._drawStyledLine(e,
         e.color,
         strokeWidth,
         strokePattern,
         drawPoints,
         drawPointCallback,
         pointSize,
      );
   }

   /**
    * Draws the shaded error bars/confidence intervals for each series.
    * This happens before the center lines are drawn, since the center lines
    * need to be drawn on top of the error bars for all series.
    * @private
    */
   static _errorPlotter(e) {
      const g = e.dygraph;
      const setName = e.setName;
      const errorBars = g.getBooleanOption('errorBars') || g.getBooleanOption('customBars');
      if (!errorBars) return;

      const fillGraph = g.getBooleanOption('fillGraph', setName);
      if (fillGraph) {
         console.warn("Can't use fillGraph option with error bars");
      }

      const ctx = e.drawingContext;
      const color = e.color;
      const fillAlpha = g.getNumericOption('fillAlpha', setName);
      const stepPlot = g.getBooleanOption('stepPlot', setName);
      const points = e.points;

      const iter = utils.createIterator(points, 0, points.length,
         DygraphCanvasRenderer._getIteratorPredicate(
            g.getBooleanOption('connectSeparatedPoints', setName)));

      let newYs;

      // setup graphics context
      let prevX = NaN;
      let prevY = NaN;
      let prevYs = [-1, -1];
      // should be same color as the lines but only 15% opaque.
      // const rgb = utils.toRGB_(color);
      // const err_color = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      // ctx.fillStyle = err_color;
      ctx.fillStyle = color;
      ctx.beginPath();

      const isNullUndefinedOrNaN = x => x === null || x === undefined || isNaN(x);

      while (iter.hasNext) {
         const point = iter.next();
         if ((!stepPlot && isNullUndefinedOrNaN(point.y)) ||
           (stepPlot && !isNaN(prevY) && isNullUndefinedOrNaN(prevY))) {
            prevX = NaN;
            continue;
         }

         newYs = [point.y_bottom, point.y_top];
         if (stepPlot) {
            prevY = point.y;
         }

         // The documentation specifically disallows nulls inside the point arrays,
         // but in case it happens we should do something sensible.
         if (isNaN(newYs[0])) newYs[0] = point.y;
         if (isNaN(newYs[1])) newYs[1] = point.y;

         newYs[0] = e.plotArea.h * newYs[0] + e.plotArea.y;
         newYs[1] = e.plotArea.h * newYs[1] + e.plotArea.y;
         if (!isNaN(prevX)) {
            if (stepPlot) {
               ctx.moveTo(prevX, prevYs[0]);
               ctx.lineTo(point.canvasx, prevYs[0]);
               ctx.lineTo(point.canvasx, prevYs[1]);
            }
            else {
               ctx.moveTo(prevX, prevYs[0]);
               ctx.lineTo(point.canvasx, newYs[0]);
               ctx.lineTo(point.canvasx, newYs[1]);
            }
            ctx.lineTo(prevX, prevYs[1]);
            // ctx.closePath();
         }
         prevYs = newYs;
         prevX = point.canvasx;
      }
      ctx.fill();
   }

   /**
    * Proxy for CanvasRenderingContext2D which drops moveTo/lineTo calls which are
    * superfluous. It accumulates all movements which haven't changed the x-value
    * and only applies the two with the most extreme y-values.
    *
    * Calls to lineTo/moveTo must have non-decreasing x-values.
    */
   static _fastCanvasProxy(context) {
      let pendingActions = []; // array of [type, x, y] tuples
      let lastRoundedX = null;
      let lastFlushedX = null;

      const LINE_TO = 1;
      const MOVE_TO = 2;

      let actionCount = 0; // number of moveTos and lineTos passed to context.

      // Drop superfluous motions
      // Assumes all pendingActions have the same (rounded) x-value.
      const compressActions = function (opt_losslessOnly) {
         if (pendingActions.length <= 1) return;

         // Lossless compression: drop inconsequential moveTos.
         for (var i = pendingActions.length - 1; i > 0; i--) {
            var action = pendingActions[i];
            if (action[0] == MOVE_TO) {
               const prevAction = pendingActions[i - 1];
               if (prevAction[1] == action[1] && prevAction[2] == action[2]) {
                  pendingActions.splice(i, 1);
               }
            }
         }

         // Lossless compression: ... drop consecutive moveTos ...
         for (var i = 0; i < pendingActions.length - 1; /* incremented internally */) {
            var action = pendingActions[i];
            if (action[0] == MOVE_TO && pendingActions[i + 1][0] == MOVE_TO) {
               pendingActions.splice(i, 1);
            }
            else {
               i++;
            }
         }

         // Lossy compression: ... drop all but the extreme y-values ...
         if (pendingActions.length > 2 && !opt_losslessOnly) {
            // keep an initial moveTo, but drop all others.
            let startIdx = 0;
            if (pendingActions[0][0] == MOVE_TO) startIdx++;
            let minIdx = null;
            let maxIdx = null;
            for (var i = startIdx; i < pendingActions.length; i++) {
               var action = pendingActions[i];
               if (action[0] != LINE_TO) continue;
               if (minIdx === null && maxIdx === null) {
                  minIdx = i;
                  maxIdx = i;
               }
               else {
                  const y = action[2];
                  if (y < pendingActions[minIdx][2]) {
                     minIdx = i;
                  }
                  else if (y > pendingActions[maxIdx][2]) {
                     maxIdx = i;
                  }
               }
            }
            const minAction = pendingActions[minIdx];
            const maxAction = pendingActions[maxIdx];
            pendingActions.splice(startIdx, pendingActions.length - startIdx);
            if (minIdx < maxIdx) {
               pendingActions.push(minAction);
               pendingActions.push(maxAction);
            }
            else if (minIdx > maxIdx) {
               pendingActions.push(maxAction);
               pendingActions.push(minAction);
            }
            else {
               pendingActions.push(minAction);
            }
         }
      };

      const flushActions = function (opt_noLossyCompression) {
         compressActions(opt_noLossyCompression);
         for (let i = 0, len = pendingActions.length; i < len; i++) {
            const action = pendingActions[i];
            if (action[0] == LINE_TO) {
               context.lineTo(action[1], action[2]);
            }
            else if (action[0] == MOVE_TO) {
               context.moveTo(action[1], action[2]);
            }
         }
         if (pendingActions.length) {
            lastFlushedX = pendingActions[pendingActions.length - 1][1];
         }
         actionCount += pendingActions.length;
         pendingActions = [];
      };

      const addAction = function (action, x, y) {
         const rx = Math.round(x);
         if (lastRoundedX === null || rx != lastRoundedX) {
            // if there are large gaps on the x-axis, it's essential to keep the
            // first and last point as well.
            const hasGapOnLeft = (lastRoundedX - lastFlushedX > 1);

            const hasGapOnRight = (rx - lastRoundedX > 1);
            const hasGap = hasGapOnLeft || hasGapOnRight;
            flushActions(hasGap);
            lastRoundedX = rx;
         }
         pendingActions.push([action, x, y]);
      };

      return {
         moveTo(x, y) {
            addAction(MOVE_TO, x, y);
         },
         lineTo(x, y) {
            addAction(LINE_TO, x, y);
         },

         // for major operations like stroke/fill, we skip compression to ensure
         // that there are no artifacts at the right edge.
         stroke() { flushActions(true); context.stroke(); },
         fill() { flushActions(true); context.fill(); },
         beginPath() { flushActions(true); context.beginPath(); },
         closePath() { flushActions(true); context.closePath(); },

         _count() { return actionCount; },
      };
   }

   /**
    * Draws the shaded regions when "fillGraph" is set. Not to be confused with
    * error bars.
    *
    * For stacked charts, it's more convenient to handle all the series
    * simultaneously. So this plotter plots all the points on the first series
    * it's asked to draw, then ignores all the other series.
    *
    * @private
    */
   static _fillPlotter(e) {
      // Skip if we're drawing a single series for interactive highlight overlay.
      if (e.singleSeriesName) return;

      // We'll handle all the series at once, not one-by-one.
      if (e.seriesIndex !== 0) return;

      const g = e.dygraph;
      const setNames = g.getLabels().slice(1); // remove x-axis

      // getLabels() includes names for invisible series, which are not included in
      // allSeriesPoints. We remove those to make the two match.
      // TODO(danvk): provide a simpler way to get this information.
      for (let i = setNames.length; i >= 0; i--) {
         if (!g.visibility()[i]) setNames.splice(i, 1);
      }

      const anySeriesFilled = (function () {
         for (let i = 0; i < setNames.length; i++) {
            if (g.getBooleanOption('fillGraph', setNames[i])) return true;
         }
         return false;
      }());

      if (!anySeriesFilled) return;

      const area = e.plotArea;
      const sets = e.allSeriesPoints;
      const setCount = sets.length;

      const stackedGraph = g.getBooleanOption('stackedGraph');
      const colors = g.getColors();

      // For stacked graphs, track the baseline for filling.
      //
      // The filled areas below graph lines are trapezoids with two
      // vertical edges. The top edge is the line segment being drawn, and
      // the baseline is the bottom edge. Each baseline corresponds to the
      // top line segment from the previous stacked line. In the case of
      // step plots, the trapezoids are rectangles.
      const baseline = {};
      let currBaseline;
      let prevStepPlot; // for different line drawing modes (line/step) per series

      // Helper function to trace a line back along the baseline.
      const traceBackPath = function (ctx, baselineX, baselineY, pathBack) {
         ctx.lineTo(baselineX, baselineY);
         if (stackedGraph) {
            for (let i = pathBack.length - 1; i >= 0; i--) {
               const pt = pathBack[i];
               ctx.lineTo(pt[0], pt[1]);
            }
         }
      };

      // process sets in reverse order (needed for stacked graphs)
      for (let setIdx = setCount - 1; setIdx >= 0; setIdx--) {
         let ctx = e.drawingContext;
         const setName = setNames[setIdx];
         if (!g.getBooleanOption('fillGraph', setName)) continue;

         const fillAlpha = g.getNumericOption('fillAlpha', setName);
         const stepPlot = g.getBooleanOption('stepPlot', setName);
         const color = colors[setIdx];
         const axis = g.axisPropertiesForSeries(setName);
         let axisY = 1.0 + axis.minyval * axis.yscale;
         if (axisY < 0.0) axisY = 0.0;
         else if (axisY > 1.0) axisY = 1.0;
         axisY = area.h * axisY + area.y;

         const points = sets[setIdx];
         const iter = utils.createIterator(points, 0, points.length,
            DygraphCanvasRenderer._getIteratorPredicate(
               g.getBooleanOption('connectSeparatedPoints', setName)));

         // setup graphics context
         let prevX = NaN;
         let prevYs = [-1, -1];
         var newYs;
         // should be same color as the lines but only 15% opaque.
         const rgb = utils.toRGB_(color);
         const err_color =
           `rgba(${rgb.r},${rgb.g},${rgb.b},${fillAlpha})`;
         ctx.fillStyle = err_color;
         ctx.beginPath();
         var last_x;
         let is_first = true;

         // If the point density is high enough, dropping segments on their way to
         // the canvas justifies the overhead of doing so.
         if (points.length > 2 * g.width_ || Dygraph.FORCE_FAST_PROXY) {
            ctx = DygraphCanvasRenderer._fastCanvasProxy(ctx);
         }

         // For filled charts, we draw points from left to right, then back along
         // the x-axis to complete a shape for filling.
         // For stacked plots, this "back path" is a more complex shape. This array
         // stores the [x, y] values needed to trace that shape.
         let pathBack = [];

         // TODO(danvk): there are a lot of options at play in this loop.
         //     The logic would be much clearer if some (e.g. stackGraph and
         //     stepPlot) were split off into separate sub-plotters.
         var point;
         while (iter.hasNext) {
            point = iter.next();
            if (!utils.isOK(point.y) && !stepPlot) {
               traceBackPath(ctx, prevX, prevYs[1], pathBack);
               pathBack = [];
               prevX = NaN;
               if (point.y_stacked !== null && !isNaN(point.y_stacked)) {
                  baseline[point.canvasx] = area.h * point.y_stacked + area.y;
               }
               continue;
            }
            if (stackedGraph) {
               if (!is_first && last_x == point.xval) {
                  continue;
               }
               else {
                  is_first = false;
                  last_x = point.xval;
               }

               currBaseline = baseline[point.canvasx];
               var lastY;
               if (currBaseline === undefined) {
                  lastY = axisY;
               }
               else if (prevStepPlot) {
                  lastY = currBaseline[0];
               }
               else {
                  lastY = currBaseline;
               }
               newYs = [point.canvasy, lastY];

               if (stepPlot) {
                  // Step plots must keep track of the top and bottom of
                  // the baseline at each point.
                  if (prevYs[0] === -1) {
                     baseline[point.canvasx] = [point.canvasy, axisY];
                  }
                  else {
                     baseline[point.canvasx] = [point.canvasy, prevYs[0]];
                  }
               }
               else {
                  baseline[point.canvasx] = point.canvasy;
               }

            }
            else if (isNaN(point.canvasy) && stepPlot) {
               newYs = [area.y + area.h, axisY];
            }
            else {
               newYs = [point.canvasy, axisY];
            }
            if (!isNaN(prevX)) {
               // Move to top fill point
               if (stepPlot) {
                  ctx.lineTo(point.canvasx, prevYs[0]);
                  ctx.lineTo(point.canvasx, newYs[0]);
               }
               else {
                  ctx.lineTo(point.canvasx, newYs[0]);
               }

               // Record the baseline for the reverse path.
               if (stackedGraph) {
                  pathBack.push([prevX, prevYs[1]]);
                  if (prevStepPlot && currBaseline) {
                     // Draw to the bottom of the baseline
                     pathBack.push([point.canvasx, currBaseline[1]]);
                  }
                  else {
                     pathBack.push([point.canvasx, newYs[1]]);
                  }
               }
            }
            else {
               ctx.moveTo(point.canvasx, newYs[1]);
               ctx.lineTo(point.canvasx, newYs[0]);
            }
            prevYs = newYs;
            prevX = point.canvasx;
         }
         prevStepPlot = stepPlot;
         if (newYs && point) {
            traceBackPath(ctx, point.canvasx, newYs[1], pathBack);
            pathBack = [];
         }
         ctx.fill();
      }
   }
}

/**
 * Standard plotters. These may be used by clients via Dygraph.Plotters.
 * See comments there for more details.
 */
DygraphCanvasRenderer._Plotters = {
   linePlotter(e) {
      DygraphCanvasRenderer._linePlotter(e);
   },

   fillPlotter(e) {
      DygraphCanvasRenderer._fillPlotter(e);
   },

   errorPlotter(e) {
      DygraphCanvasRenderer._errorPlotter(e);
   },
};

export default DygraphCanvasRenderer;
