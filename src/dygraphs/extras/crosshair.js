/**
 * @license
 * Copyright 2015 Petr Shevtsov (petr.shevtsov@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/* global Dygraph:false */
/* jshint globalstrict: true */
Dygraph.Plugins.Crosshair = (function () {
  /**
   * Creates the crosshair
   *
   * @constructor
   */

  class crosshair {
    constructor(opt_options) {
      this.canvas_ = document.createElement('canvas');
      opt_options = opt_options || {};
      this.direction_ = opt_options.direction || null;
    }

    toString() {
      return 'Crosshair Plugin';
    }

    /**
      * @param {Dygraph} g Graph instance.
      * @return {object.<string, function(ev)>} Mapping of event names to callbacks.
      */
    activate(g) {
      g.graphDiv.appendChild(this.canvas_);

      return {
        select: this.select,
        deselect: this.deselect,
      };
    }

    select(e) {
      if (this.direction_ === null) {
        return;
      }

      const width = e.dygraph.width_;
      const height = e.dygraph.height_;
      this.canvas_.width = width;
      this.canvas_.height = height;
      this.canvas_.style.width = `${width}px`; // for IE
      this.canvas_.style.height = `${height}px`; // for IE

      const ctx = this.canvas_.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(0, 0, 0,0.3)';
      ctx.beginPath();

      const canvasx = Math.floor(e.dygraph.selPoints_[0].canvasx) + 0.5; // crisper rendering

      if (this.direction_ === 'vertical' || this.direction_ === 'both') {
        ctx.moveTo(canvasx, 0);
        ctx.lineTo(canvasx, height);
      }

      if (this.direction_ === 'horizontal' || this.direction_ === 'both') {
        for (let i = 0; i < e.dygraph.selPoints_.length; i++) {
          const canvasy = Math.floor(e.dygraph.selPoints_[i].canvasy) + 0.5; // crisper rendering
          ctx.moveTo(0, canvasy);
          ctx.lineTo(width, canvasy);
        }
      }

      ctx.stroke();
      ctx.closePath();
    }

    deselect(e) {
      const ctx = this.canvas_.getContext('2d');
      ctx.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
    }

    destroy() {
      this.canvas_ = null;
    }
  }

  return crosshair;
}());
