/* eslint-disable */

/**
 * @license
 * Copyright 2012 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */
/* global Dygraph:false */

/*

Current bits of jankiness:
- Direct layout access
- Direct area access

*/


/**
 * Draws the gridlines, i.e. the gray horizontal & vertical lines running the
 * length of the chart.
 *
 * @constructor
 */
class grid {
   toString() {
      return 'Gridline Plugin';
   }

   activate(g) {
      return {
         willDrawChart: this.willDrawChart,
      };
   }

   willDrawChart(e) {
      // Draw the new X/Y grid. Lines appear crisper when pixels are rounded to
      // half-integers. This prevents them from drawing in two rows/cols.
      const g = e.dygraph;
      const ctx = e.drawingContext;
      const layout = g.layout_;
      const area = e.dygraph.plotter_.area;

      function halfUp(x) { return Math.round(x) + 0.5; }
      function halfDown(y) { return Math.round(y) - 0.5; }

      let x;
      let y;
      var i;
      let ticks;
      if (g.getOptionForAxis('drawGrid', 'y')) {
         const axes = ['y', 'y2'];
         const strokeStyles = [];
         const lineWidths = [];
         const drawGrid = [];
         var stroking = [];
         var strokePattern = [];
         for (var i = 0; i < axes.length; i++) {
            drawGrid[i] = g.getOptionForAxis('drawGrid', axes[i]);
            if (drawGrid[i]) {
               strokeStyles[i] = g.getOptionForAxis('gridLineColor', axes[i]);
               lineWidths[i] = g.getOptionForAxis('gridLineWidth', axes[i]);
               strokePattern[i] = g.getOptionForAxis('gridLinePattern', axes[i]);
               stroking[i] = strokePattern[i] && (strokePattern[i].length >= 2);
            }
         }
         ticks = layout.yticks;
         ctx.save();
         // draw grids for the different y axes
         ticks.forEach((tick) => {
            if (!tick.has_tick) return;
            const axis = tick.axis;
            if (drawGrid[axis]) {
               ctx.save();
               if (stroking[axis]) {
                  if (ctx.setLineDash) ctx.setLineDash(strokePattern[axis]);
               }
               ctx.strokeStyle = strokeStyles[axis];
               ctx.lineWidth = lineWidths[axis];

               x = halfUp(area.x);
               y = halfDown(area.y + tick.pos * area.h);
               ctx.beginPath();
               ctx.moveTo(x, y);
               ctx.lineTo(x + area.w, y);
               ctx.stroke();

               ctx.restore();
            }
         });
         ctx.restore();
      }

      // draw grid for x axis
      if (g.getOptionForAxis('drawGrid', 'x')) {
         ticks = layout.xticks;
         ctx.save();
         var strokePattern = g.getOptionForAxis('gridLinePattern', 'x');
         var stroking = strokePattern && (strokePattern.length >= 2);
         if (stroking) {
            if (ctx.setLineDash) ctx.setLineDash(strokePattern);
         }
         ctx.strokeStyle = g.getOptionForAxis('gridLineColor', 'x');
         ctx.lineWidth = g.getOptionForAxis('gridLineWidth', 'x');
         ticks.forEach((tick) => {
            if (!tick.has_tick) return;
            x = halfUp(area.x + tick.pos * area.w);
            y = halfDown(area.y + area.h);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, area.y);
            ctx.closePath();
            ctx.stroke();
         });
         if (stroking) {
            if (ctx.setLineDash) ctx.setLineDash([]);
         }
         ctx.restore();
      }
   }

   destroy() {
   }
}

export default grid;
