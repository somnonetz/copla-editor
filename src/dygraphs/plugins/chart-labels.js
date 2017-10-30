/* eslint-disable */

/**
 * @license
 * Copyright 2012 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */
/* global Dygraph:false */


// TODO(danvk): move chart label options out of dygraphs and into the plugin.
// TODO(danvk): only tear down & rebuild the DIVs when it's necessary.

class chart_labels {
   constructor() {
      this.title_div_ = null;
      this.xlabel_div_ = null;
      this.ylabel_div_ = null;
      this.y2label_div_ = null;
   }

   toString() {
      return 'ChartLabels Plugin';
   }

   activate(g) {
      return {
         layout: this.layout,
         // clearChart: this.clearChart,
         didDrawChart: this.didDrawChart,
      };
   }

   // Detach and null out any existing nodes.
   detachLabels_() {
      const els = [this.title_div_,
         this.xlabel_div_,
         this.ylabel_div_,
         this.y2label_div_];
      for (let i = 0; i < els.length; i++) {
         const el = els[i];
         if (!el) continue;
         if (el.parentNode) el.parentNode.removeChild(el);
      }

      this.title_div_ = null;
      this.xlabel_div_ = null;
      this.ylabel_div_ = null;
      this.y2label_div_ = null;
   }

   layout(e) {
      this.detachLabels_();

      const g = e.dygraph;
      const div = e.chart_div;
      if (g.getOption('title')) {
         // QUESTION: should this return an absolutely-positioned div instead?
         const title_rect = e.reserveSpaceTop(g.getOption('titleHeight'));
         this.title_div_ = createDivInRect(title_rect);
         this.title_div_.style.fontSize = `${g.getOption('titleHeight') - 8}px`;

         var class_div = document.createElement('div');
         class_div.className = 'dygraph-label dygraph-title';
         class_div.innerHTML = g.getOption('title');
         this.title_div_.appendChild(class_div);
         div.appendChild(this.title_div_);
      }

      if (g.getOption('xlabel')) {
         const x_rect = e.reserveSpaceBottom(g.getOption('xLabelHeight'));
         this.xlabel_div_ = createDivInRect(x_rect);
         this.xlabel_div_.style.fontSize = `${g.getOption('xLabelHeight') - 2}px`;

         var class_div = document.createElement('div');
         class_div.className = 'dygraph-label dygraph-xlabel';
         class_div.innerHTML = g.getOption('xlabel');
         this.xlabel_div_.appendChild(class_div);
         div.appendChild(this.xlabel_div_);
      }

      if (g.getOption('ylabel')) {
         // It would make sense to shift the chart here to make room for the y-axis
         // label, but the default yAxisLabelWidth is large enough that this results
         // in overly-padded charts. The y-axis label should fit fine. If it
         // doesn't, the yAxisLabelWidth option can be increased.
         const y_rect = e.reserveSpaceLeft(0);

         this.ylabel_div_ = createRotatedDiv(
            g, y_rect,
            1, // primary (left) y-axis
            'dygraph-label dygraph-ylabel',
            g.getOption('ylabel'));
         div.appendChild(this.ylabel_div_);
      }

      if (g.getOption('y2label') && g.numAxes() == 2) {
         // same logic applies here as for ylabel.
         const y2_rect = e.reserveSpaceRight(0);
         this.y2label_div_ = createRotatedDiv(
            g, y2_rect,
            2, // secondary (right) y-axis
            'dygraph-label dygraph-y2label',
            g.getOption('y2label'));
         div.appendChild(this.y2label_div_);
      }
   }

   didDrawChart(e) {
      // it's very unlikely that the labels changed and the DOM operations are too expensive
      return;
      // const g = e.dygraph;
      // if (this.title_div_) {
      //    this.title_div_.children[0].innerHTML = g.getOption('title');
      // }
      // if (this.xlabel_div_) {
      //    this.xlabel_div_.children[0].innerHTML = g.getOption('xlabel');
      // }
      // if (this.ylabel_div_) {
      //    this.ylabel_div_.children[0].children[0].innerHTML = g.getOption('ylabel');
      // }
      // if (this.y2label_div_) {
      //    this.y2label_div_.children[0].children[0].innerHTML = g.getOption('y2label');
      // }
   }

   clearChart() {
   }

   destroy() {
      this.detachLabels_();
   }
}

// QUESTION: should there be a plugin-utils.js?
const createDivInRect = function (r) {
   const div = document.createElement('div');
   div.style.position = 'absolute';
   div.style.left = `${r.x}px`;
   div.style.top = `${r.y}px`;
   div.style.width = `${r.w}px`;
   div.style.height = `${r.h}px`;
   return div;
};

const createRotatedDiv = function (g, box, axis, classes, html) {
   // TODO(danvk): is this outer div actually necessary?
   const div = document.createElement('div');
   div.style.position = 'absolute';
   if (axis == 1) {
      // NOTE: this is cheating. Should be positioned relative to the box.
      div.style.left = '0px';
   }
   else {
      div.style.left = `${box.x}px`;
   }
   div.style.top = `${box.y}px`;
   div.style.width = `${box.w}px`;
   div.style.height = `${box.h}px`;
   div.style.fontSize = `${g.getOption('yLabelWidth') - 2}px`;

   const inner_div = document.createElement('div');
   inner_div.style.position = 'absolute';
   inner_div.style.width = `${box.h}px`;
   inner_div.style.height = `${box.w}px`;
   inner_div.style.top = `${box.h / 2 - box.w / 2}px`;
   inner_div.style.left = `${box.w / 2 - box.h / 2}px`;
   // TODO: combine inner_div and class_div.
   inner_div.className = `dygraph-label-rotate-${axis == 1 ? 'right' : 'left'}`;

   const class_div = document.createElement('div');
   class_div.className = classes;
   class_div.innerHTML = html;

   inner_div.appendChild(class_div);
   div.appendChild(inner_div);
   return div;
};

export default chart_labels;
