/* eslint-disable */

/**
 * @license
 * Copyright 2012 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/* global Dygraph:false */


/*
Bits of jankiness:
- Direct layout access
- Direct area access
- Should include calculation of ticks, not just the drawing.

Options left to make axis-friendly.
  ('drawAxesAtZero')
  ('xAxisHeight')
*/

import * as utils from '../dygraph-utils';

/**
 * Draws the axes. This includes the labels on the x- and y-axes, as well
 * as the tick marks on the axes.
 * It does _not_ draw the grid lines which span the entire chart.
 */
class axes {
   constructor() {
      this.xlabels_ = [];
      this.ylabels_ = [];
   }

   toString() {
      return 'Axes Plugin';
   }

   activate(g) {
      return {
         layout: this.layout,
         clearChart: this.clearChart,
         willDrawChart: this.willDrawChart,
      };
   }

   layout(e) {
      const g = e.dygraph;

      if (g.getOptionForAxis('drawAxis', 'y')) {
         var w = g.getOptionForAxis('axisLabelWidth', 'y') + 2 * g.getOptionForAxis('axisTickSize', 'y');
         e.reserveSpaceLeft(w);
      }

      if (g.getOptionForAxis('drawAxis', 'x')) {
         let h;
         // NOTE: I think this is probably broken now, since g.getOption() now
         // hits the dictionary. (That is, g.getOption('xAxisHeight') now always
         // has a value.)
         if (g.getOption('xAxisHeight')) {
            h = g.getOption('xAxisHeight');
         }
         else {
            h = g.getOptionForAxis('axisLabelFontSize', 'x') + 2 * g.getOptionForAxis('axisTickSize', 'x');
         }
         e.reserveSpaceBottom(h);
      }

      if (g.numAxes() == 2) {
         if (g.getOptionForAxis('drawAxis', 'y2')) {
            var w = g.getOptionForAxis('axisLabelWidth', 'y2') + 2 * g.getOptionForAxis('axisTickSize', 'y2');
            e.reserveSpaceRight(w);
         }
      }
      else if (g.numAxes() > 2) {
         g.error(`${'Only two y-axes are supported at this time. (Trying ' +
               'to use '}${g.numAxes()})`);
      }
   }

   detachLabels() {
      function removeArray(ary) {
         for (let i = 0; i < ary.length; i++) {
            const el = ary[i];
            if (el.parentNode) el.parentNode.removeChild(el);
         }
      }

      removeArray(this.xlabels_);
      removeArray(this.ylabels_);
      this.xlabels_ = [];
      this.ylabels_ = [];
   }

   clearChart(e) {
      // this.detachLabels();
   }

   willDrawChart(e) {
      const g = e.dygraph;

      if (!g.getOptionForAxis('drawAxis', 'x') &&
         !g.getOptionForAxis('drawAxis', 'y') &&
         !g.getOptionForAxis('drawAxis', 'y2')) {
         return;
      }

      // Round pixels to half-integer boundaries for crisper drawing.
      function halfUp(x) { return Math.round(x) + 0.5; }
      function halfDown(y) { return Math.round(y) - 0.5; }

      const context = e.drawingContext;
      const containerDiv = e.canvas.parentNode;
      const canvasWidth = g.width_; // e.canvas.width is affected by pixel ratio.
      const canvasHeight = g.height_;

      let label;
      let x;
      let y;

      const makeDiv = function (txt, axis, prec_axis) {
         /*
          * This seems to be called with the following three sets of axis/prec_axis:
          * x: undefined
          * y: y1
          * y: y2
          */
         const div = document.createElement('div');
         div.className = `dygraph-axis-label dygraph-axis-label-${axis} ${prec_axis ? `dygraph-axis-label-${prec_axis}` : ''}`;
         div.innerText = txt;
         return div;
      };

      // axis lines
      context.save();

      const layout = g.layout_;
      const area = e.dygraph.plotter_.area;

      // Helper for repeated axis-option accesses.
      const makeOptionGetter = function (axis) {
         return function (option) {
            return g.getOptionForAxis(option, axis);
         };
      };

      if (g.getOptionForAxis('drawAxis', 'y')) {
         if (layout.yticks && layout.yticks.length > 0) {
            const num_axes = g.numAxes();
            const getOptions = [makeOptionGetter('y'), makeOptionGetter('y2')];
            layout.yticks.forEach((tick, i) => {
               if (tick.label === undefined) return; // this tick only has a grid line.
               if (g.elementsCache && g.elementsCache[tick.label]) return; // we already drew this one

               x = area.x;
               // let sgn = 1;
               let prec_axis = 'y1';
               let getAxisOption = getOptions[0];
               if (tick.axis == 1) { // right-side y-axis
                  x = area.x + area.w;
                  // sgn = -1;
                  prec_axis = 'y2';
                  getAxisOption = getOptions[1];
               }
               const fontSize = getAxisOption('axisLabelFontSize');
               y = area.y + tick.pos * area.h;

               /* Tick marks are currently clipped, so don't bother drawing them.
                 context.beginPath();
                 context.moveTo(halfUp(x), halfDown(y));
                 context.lineTo(halfUp(x - sgn * this.attr_('axisTickSize')), halfDown(y));
                 context.closePath();
                 context.stroke();
                */

               label = this.ylabels_[i];

               if (label) {
                  label.innerText = tick.label;
               }
               else {
                  label = makeDiv(tick.label, 'y', num_axes == 2 ? prec_axis : null);
                  this.ylabels_.push(label);
                  if (g.elementsCache) g.elementsCache[tick.label] = label;
                  containerDiv.appendChild(label);
               }

               let top = (y - fontSize / 2);
               if (top < 0) top = 0;

               if (top + fontSize + 3 > canvasHeight) {
                  label.style.bottom = '0';
               }
               else {
                  label.style.top = `${top}px`;
               }
               // TODO: replace these with css classes?
               if (tick.axis === 0) {
                  label.style.left = `${area.x - getAxisOption('axisLabelWidth') - getAxisOption('axisTickSize')}px`;
                  label.style.textAlign = 'right';
               }
               else if (tick.axis == 1) {
                  label.style.left = `${area.x + area.w +
                                 getAxisOption('axisTickSize')}px`;
                  label.style.textAlign = 'left';
               }
               label.style.width = `${getAxisOption('axisLabelWidth')}px`;
            });

            while (this.ylabels_.length > layout.xticks.length) {
               const el = this.ylabels_.pop();
               if (el.remove) el.remove();
               else if (el.parentNode) el.parentNode.removeChild(el);
            }

            // The lowest tick on the y-axis often overlaps with the leftmost
            // tick on the x-axis. Shift the bottom tick up a little bit to
            // compensate if necessary.
            const bottomTick = this.ylabels_[0];
            if (bottomTick) {
              // Interested in the y2 axis also?
              const fontSize = g.getOptionForAxis('axisLabelFontSize', 'y');
              const bottom = parseInt(bottomTick.style.top, 10) + fontSize;
              if (bottom > canvasHeight - fontSize) {
                 bottomTick.style.top = `${parseInt(bottomTick.style.top, 10) -
                 fontSize / 2}px`;
              }
            }
         }

         // draw a vertical line on the left to separate the chart from the labels.
         let axisX;
         if (g.getOption('drawAxesAtZero')) {
            var r = g.toPercentXCoord(0);
            if (r > 1 || r < 0 || isNaN(r)) r = 0;
            axisX = halfUp(area.x + r * area.w);
         }
         else {
            axisX = halfUp(area.x);
         }

         context.strokeStyle = g.getOptionForAxis('axisLineColor', 'y');
         context.lineWidth = g.getOptionForAxis('axisLineWidth', 'y');

         context.beginPath();
         context.moveTo(axisX, halfDown(area.y));
         context.lineTo(axisX, halfDown(area.y + area.h));
         context.closePath();
         context.stroke();

         // if there's a secondary y-axis, draw a vertical line for that, too.
         if (g.numAxes() === 2) {
            context.strokeStyle = g.getOptionForAxis('axisLineColor', 'y2');
            context.lineWidth = g.getOptionForAxis('axisLineWidth', 'y2');
            context.beginPath();
            context.moveTo(halfDown(area.x + area.w), halfDown(area.y));
            context.lineTo(halfDown(area.x + area.w), halfDown(area.y + area.h));
            context.closePath();
            context.stroke();
         }
      }

      if (g.getOptionForAxis('drawAxis', 'x')) {
         if (layout.xticks) {
            const getAxisOption = makeOptionGetter('x');
            layout.xticks.forEach((tick, i) => {
               if (tick.label === undefined) return; // this tick only has a grid line.
               x = area.x + tick.pos * area.w;
               y = area.y + area.h;

               /* Tick marks are currently clipped, so don't bother drawing them.
                  context.beginPath();
                  context.moveTo(halfUp(x), halfDown(y));
                  context.lineTo(halfUp(x), halfDown(y + this.attr_('axisTickSize')));
                  context.closePath();
                  context.stroke();
                */

               label = this.xlabels_[i];

               if (label) {
                  label.innerText = tick.label;
               }
               else {
                  label = makeDiv(tick.label, 'x');
                  containerDiv.appendChild(label);
                  this.xlabels_.push(label);
               }

               // label.style.top = `${y + getAxisOption('axisTickSize')}px`;

               let left = (x - getAxisOption('axisLabelWidth') / 2);
               if (left + getAxisOption('axisLabelWidth') > canvasWidth) {
                  left = canvasWidth - getAxisOption('axisLabelWidth');
                  label.style.textAlign = 'right';
               }
               else if (left < 0) {
                  left = 0;
                  label.style.textAlign = 'left';
               }
               else {
                  label.style.textAlign = '';
               }

               // label.style.left = `${left}px`;
               label.style.transform = `translateX(${left}px)`;
               // label.style.width = `${getAxisOption('axisLabelWidth')}px`;
            });
         }


         while (this.xlabels_.length > layout.xticks.length) {
            const el = this.xlabels_.pop();
            if (el.remove) el.remove();
            else if (el.parentNode) el.parentNode.removeChild(el);
         }

         context.strokeStyle = g.getOptionForAxis('axisLineColor', 'x');
         context.lineWidth = g.getOptionForAxis('axisLineWidth', 'x');
         context.beginPath();
         let axisY;
         if (g.getOption('drawAxesAtZero')) {
            var r = g.toPercentYCoord(0, 0);
            if (r > 1 || r < 0) r = 1;
            axisY = halfDown(area.y + r * area.h);
         }
         else {
            axisY = halfDown(area.y + area.h);
         }
         context.moveTo(halfUp(area.x), axisY);
         context.lineTo(halfUp(area.x + area.w), axisY);
         context.closePath();
         context.stroke();
      }

      context.restore();
   }
}

export default axes;
