/* eslint-disable */

/**
 * @license
 * Copyright 2011 Paul Felix (paul.eric.felix@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */
/* global Dygraph:false,TouchEvent:false */

/**
 * @fileoverview This file contains the RangeSelector plugin used to provide
 * a timeline range selector widget for dygraphs.
 */

/* global Dygraph:false */


import * as utils from '../dygraph-utils';
import DygraphInteraction from '../dygraph-interaction-model';
import IFrameTarp from '../iframe-tarp';

class rangeSelector {
   constructor() {
      this.hasTouchInterface_ = typeof (TouchEvent) !== 'undefined';
      this.isMobileDevice_ = /mobile|android/gi.test(navigator.appVersion);
      this.interfaceCreated_ = false;
   }

   toString() {
      return 'RangeSelector Plugin';
   }

   activate(dygraph) {
      this.dygraph_ = dygraph;
      if (this.getOption_('showRangeSelector')) {
         this.createInterface_();
      }
      return {
         layout: this.reserveSpace_,
         predraw: this.renderStaticLayer_,
         didDrawChart: this.renderInteractiveLayer_,
      };
   }

   destroy() {
      this.bgcanvas_ = null;
      this.fgcanvas_ = null;
      this.leftZoomHandle_ = null;
      this.rightZoomHandle_ = null;
   }

   //------------------------------------------------------------------
   // Private methods
   //------------------------------------------------------------------

   getOption_(name, opt_series) {
      return this.dygraph_.getOption(name, opt_series);
   }

   setDefaultOption_(name, value) {
      this.dygraph_.attrs_[name] = value;
   }

   /**
    * @private
    * Creates the range selector elements and adds them to the graph.
    */
   createInterface_() {
      this.createCanvases_();
      this.createZoomHandles_();
      this.initInteraction_();

      // Range selector and animatedZooms have a bad interaction. See issue 359.
      if (this.getOption_('animatedZooms')) {
         console.warn('Animated zooms and range selector are not compatible; disabling animatedZooms.');
         this.dygraph_.updateOptions({ animatedZooms: false }, true);
      }

      this.interfaceCreated_ = true;
      this.addToGraph_();
   }

   /**
    * @private
    * Adds the range selector to the graph.
    */
   addToGraph_() {
      const graphDiv = this.graphDiv_ = this.dygraph_.graphDiv;
      graphDiv.appendChild(this.bgcanvas_);
      graphDiv.appendChild(this.fgcanvas_);
      graphDiv.appendChild(this.leftZoomHandle_);
      graphDiv.appendChild(this.rightZoomHandle_);
   }

   /**
    * @private
    * Removes the range selector from the graph.
    */
   removeFromGraph_() {
      const graphDiv = this.graphDiv_;
      graphDiv.removeChild(this.bgcanvas_);
      graphDiv.removeChild(this.fgcanvas_);
      graphDiv.removeChild(this.leftZoomHandle_);
      graphDiv.removeChild(this.rightZoomHandle_);
      this.graphDiv_ = null;
   }

   /**
    * @private
    * Called by Layout to allow range selector to reserve its space.
    */
   reserveSpace_(e) {
      if (this.getOption_('showRangeSelector')) {
         e.reserveSpaceBottom(this.getOption_('rangeSelectorHeight') + 4);
      }
   }

   /**
    * @private
    * Renders the static portion of the range selector at the predraw stage.
    */
   renderStaticLayer_() {
      if (!this.updateVisibility_()) {
         return;
      }
      this.resize_();
      this.drawStaticLayer_();
   }

   /**
    * @private
    * Renders the interactive portion of the range selector after the chart has been drawn.
    */
   renderInteractiveLayer_() {
      if (!this.updateVisibility_() || this.isChangingRange_) {
         return;
      }
      this.placeZoomHandles_();
      this.drawInteractiveLayer_();
   }

   /**
    * @private
    * Check to see if the range selector is enabled/disabled and update visibility accordingly.
    */
   updateVisibility_() {
      const enabled = this.getOption_('showRangeSelector');
      if (enabled) {
         if (!this.interfaceCreated_) {
            this.createInterface_();
         }
         else if (!this.graphDiv_ || !this.graphDiv_.parentNode) {
            this.addToGraph_();
         }
      }
      else if (this.graphDiv_) {
         this.removeFromGraph_();
         const dygraph = this.dygraph_;
         setTimeout(() => { dygraph.width_ = 0; dygraph.resize(); }, 1);
      }
      return enabled;
   }

   /**
    * @private
    * Resizes the range selector.
    */
   resize_() {
      function setElementRect(canvas, context, rect, pixelRatioOption) {
         const canvasScale = pixelRatioOption || utils.getContextPixelRatio(context);

         // canvas.style.top = `${rect.y}px`;
         canvas.style.left = `${rect.x}px`;
         canvas.width = rect.w * canvasScale;
         canvas.height = rect.h * canvasScale;
         canvas.style.width = `${rect.w}px`;
         canvas.style.height = `${rect.h}px`;

         if (canvasScale != 1) {
            context.scale(canvasScale, canvasScale);
         }
      }

      const plotArea = this.dygraph_.layout_.getPlotArea();

      // let xAxisLabelHeight = 0;
      // if (this.dygraph_.getOptionForAxis('drawAxis', 'x')) {
      //    xAxisLabelHeight = this.getOption_('xAxisHeight') || (this.getOption_('axisLabelFontSize') + 2 * this.getOption_('axisTickSize'));
      // }
      this.canvasRect_ = {
         x: plotArea.x,
         y: plotArea.y + plotArea.h,// + xAxisLabelHeight + 4,
         w: plotArea.w,
         h: this.getOption_('rangeSelectorHeight'),
      };

      const pixelRatioOption = this.dygraph_.getNumericOption('pixelRatio');
      setElementRect(this.bgcanvas_, this.bgcanvas_ctx_, this.canvasRect_, pixelRatioOption);
      setElementRect(this.fgcanvas_, this.fgcanvas_ctx_, this.canvasRect_, pixelRatioOption);
   }

   /**
    * @private
    * Creates the background and foreground canvases.
    */
   createCanvases_() {
      this.bgcanvas_ = utils.createCanvas();
      this.bgcanvas_.className = 'dygraph-rangesel-bgcanvas';
      this.bgcanvas_.style.position = 'absolute';
      this.bgcanvas_.style.zIndex = 9;
      this.bgcanvas_ctx_ = utils.getContext(this.bgcanvas_);

      this.fgcanvas_ = utils.createCanvas();
      this.fgcanvas_.className = 'dygraph-rangesel-fgcanvas';
      this.fgcanvas_.style.position = 'absolute';
      this.fgcanvas_.style.zIndex = 9;
      this.fgcanvas_.style.cursor = 'default';
      this.fgcanvas_ctx_ = utils.getContext(this.fgcanvas_);
   }

   /**
    * @private
    * Creates the zoom handle elements.
    */
   createZoomHandles_() {
      const img = new Image();
      img.className = 'dygraph-rangesel-zoomhandle';
      img.style.position = 'absolute';
      img.style.zIndex = 10;
      img.style.visibility = 'hidden'; // Initially hidden so they don't show up in the wrong place.
      img.style.cursor = 'col-resize';
      // TODO: change image to more options
      img.width = 9;
      img.height = 16;
      img.src = 'data:image/png;base64,' +
   'iVBORw0KGgoAAAANSUhEUgAAAAkAAAAQCAYAAADESFVDAAAAAXNSR0IArs4c6QAAAAZiS0dEANAA' +
   'zwDP4Z7KegAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAAd0SU1FB9sHGw0cMqdt1UwAAAAZdEVYdENv' +
   'bW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAaElEQVQoz+3SsRFAQBCF4Z9WJM8KCDVwownl' +
   '6YXsTmCUsyKGkZzcl7zkz3YLkypgAnreFmDEpHkIwVOMfpdi9CEEN2nGpFdwD03yEqDtOgCaun7s' +
   'qSTDH32I1pQA2Pb9sZecAxc5r3IAb21d6878xsAAAAAASUVORK5CYII=';

      if (this.isMobileDevice_) {
         img.width *= 2;
         img.height *= 2;
      }

      this.leftZoomHandle_ = img;
      this.leftZoomHandleWidth = this.leftZoomHandle_.width;
      this.leftZoomHandleHeight = this.leftZoomHandle_.height;
      this.rightZoomHandle_ = img.cloneNode(false);
   }

   /**
    * @private
    * Sets up the interaction for the range selector.
    */
   initInteraction_() {
      const self = this;
      const topElem = document;
      let clientXLast = 0;
      let handle = null;
      let isZooming = false;
      let isPanning = false;
      const dynamic = !this.isMobileDevice_;

      // We cover iframes during mouse interactions. See comments in
      // dygraph-utils.js for more info on why this is a good idea.
      const tarp = new IFrameTarp();

      // functions, defined below.  Defining them this way (rather than with
      // "function foo() {...}" makes JSHint happy.
      let toXDataWindow;

      let onZoomStart;
      let onZoom;
      let onZoomEnd;
      let doZoom;
      let isMouseInPanZone;
      let onPanStart;
      let onPan;
      let onPanEnd;
      let doPan;
      let onCanvasHover;

      // Touch event functions
      let onZoomHandleTouchEvent;

      let onCanvasTouchEvent;
      let addTouchEvents;

      toXDataWindow = function (zoomHandleStatus) {
         const xDataLimits = self.dygraph_.xAxisExtremes();
         const fact = (xDataLimits[1] - xDataLimits[0]) / self.canvasRect_.w;
         const xDataMin = xDataLimits[0] + (zoomHandleStatus.leftHandlePos - self.canvasRect_.x) * fact;
         const xDataMax = xDataLimits[0] + (zoomHandleStatus.rightHandlePos - self.canvasRect_.x) * fact;
         return [xDataMin, xDataMax];
      };

      onZoomStart = function (e) {
         utils.cancelEvent(e);
         isZooming = true;
         clientXLast = e.clientX;
         handle = e.target ? e.target : e.srcElement;
         if (e.type === 'mousedown' || e.type === 'dragstart') {
         // These events are removed manually.
            utils.addEvent(topElem, 'mousemove', onZoom);
            utils.addEvent(topElem, 'mouseup', onZoomEnd);
         }
         self.fgcanvas_.style.cursor = 'col-resize';
         tarp.cover();
         return true;
      };

      onZoom = function (e) {
         if (!isZooming) {
            return false;
         }
         utils.cancelEvent(e);

         const delX = e.clientX - clientXLast;
         if (Math.abs(delX) < 4) {
            return true;
         }
         clientXLast = e.clientX;

         // Move handle.
         const zoomHandleStatus = self.getZoomHandleStatus_();
         let newPos;
         if (handle == self.leftZoomHandle_) {
            newPos = zoomHandleStatus.leftHandlePos + delX;
            newPos = Math.min(newPos, zoomHandleStatus.rightHandlePos - handle.width - 3);
            newPos = Math.max(newPos, self.canvasRect_.x);
         }
         else {
            newPos = zoomHandleStatus.rightHandlePos + delX;
            newPos = Math.min(newPos, self.canvasRect_.x + self.canvasRect_.w);
            newPos = Math.max(newPos, zoomHandleStatus.leftHandlePos + handle.width + 3);
         }
         const halfHandleWidth = handle.width / 2;
         handle.style.left = `${newPos - halfHandleWidth}px`;
         self.drawInteractiveLayer_();

         // Zoom on the fly.
         if (dynamic) {
            doZoom();
         }
         return true;
      };

      onZoomEnd = function (e) {
         if (!isZooming) {
            return false;
         }
         isZooming = false;
         tarp.uncover();
         utils.removeEvent(topElem, 'mousemove', onZoom);
         utils.removeEvent(topElem, 'mouseup', onZoomEnd);
         self.fgcanvas_.style.cursor = 'default';

         // If on a slower device, zoom now.
         if (!dynamic) {
            doZoom();
         }
         return true;
      };

      doZoom = function () {
         try {
            const zoomHandleStatus = self.getZoomHandleStatus_();
            self.isChangingRange_ = true;
            if (!zoomHandleStatus.isZoomed) {
               self.dygraph_.resetZoom();
            }
            else {
               const xDataWindow = toXDataWindow(zoomHandleStatus);
               self.dygraph_.doZoomXDates_(xDataWindow[0], xDataWindow[1]);
            }
         }
         finally {
            self.isChangingRange_ = false;
         }
      };

      isMouseInPanZone = function (e) {
         let rect = self.leftZoomHandle_.getBoundingClientRect();
         const leftHandleClientX = rect.left + rect.width / 2;
         rect = self.rightZoomHandle_.getBoundingClientRect();
         const rightHandleClientX = rect.left + rect.width / 2;
         return (e.clientX > leftHandleClientX && e.clientX < rightHandleClientX);
      };

      onPanStart = function (e) {
         if (!isPanning && isMouseInPanZone(e) && self.getZoomHandleStatus_().isZoomed) {
            utils.cancelEvent(e);
            isPanning = true;
            clientXLast = e.clientX;
            if (e.type === 'mousedown') {
               // These events are removed manually.
               utils.addEvent(topElem, 'mousemove', onPan);
               utils.addEvent(topElem, 'mouseup', onPanEnd);
            }
            return true;
         }
         return false;
      };

      onPan = function (e) {
         if (!isPanning) {
            return false;
         }
         utils.cancelEvent(e);

         const delX = e.clientX - clientXLast;
         if (Math.abs(delX) < 4) {
            return true;
         }
         clientXLast = e.clientX;

         // Move range view
         const zoomHandleStatus = self.getZoomHandleStatus_();
         let leftHandlePos = zoomHandleStatus.leftHandlePos;
         let rightHandlePos = zoomHandleStatus.rightHandlePos;
         const rangeSize = rightHandlePos - leftHandlePos;
         if (leftHandlePos + delX <= self.canvasRect_.x) {
            leftHandlePos = self.canvasRect_.x;
            rightHandlePos = leftHandlePos + rangeSize;
         }
         else if (rightHandlePos + delX >= self.canvasRect_.x + self.canvasRect_.w) {
            rightHandlePos = self.canvasRect_.x + self.canvasRect_.w;
            leftHandlePos = rightHandlePos - rangeSize;
         }
         else {
            leftHandlePos += delX;
            rightHandlePos += delX;
         }
         const halfHandleWidth = self.leftZoomHandle_.width / 2;
         self.leftZoomHandle_.style.left = `${leftHandlePos - halfHandleWidth}px`;
         self.rightZoomHandle_.style.left = `${rightHandlePos - halfHandleWidth}px`;
         self.drawInteractiveLayer_();

         // Do pan on the fly.
         if (dynamic) {
            doPan();
         }
         return true;
      };

      onPanEnd = function (e) {
         if (!isPanning) {
            return false;
         }
         isPanning = false;
         utils.removeEvent(topElem, 'mousemove', onPan);
         utils.removeEvent(topElem, 'mouseup', onPanEnd);
         // If on a slower device, do pan now.
         if (!dynamic) {
            doPan();
         }
         return true;
      };

      doPan = function () {
         try {
            self.isChangingRange_ = true;
            self.dygraph_.dateWindow_ = toXDataWindow(self.getZoomHandleStatus_());
            self.dygraph_.drawGraph_(false);
         }
         finally {
            self.isChangingRange_ = false;
         }
      };

      onCanvasHover = function (e) {
         if (isZooming || isPanning) {
            return;
         }
         const cursor = isMouseInPanZone(e) ? 'move' : 'default';
         if (cursor != self.fgcanvas_.style.cursor) {
            self.fgcanvas_.style.cursor = cursor;
         }
      };

      onZoomHandleTouchEvent = function (e) {
         if (e.type == 'touchstart' && e.targetTouches.length == 1) {
            if (onZoomStart(e.targetTouches[0])) {
               utils.cancelEvent(e);
            }
         }
         else if (e.type == 'touchmove' && e.targetTouches.length == 1) {
            if (onZoom(e.targetTouches[0])) {
               utils.cancelEvent(e);
            }
         }
         else {
            onZoomEnd(e);
         }
      };

      onCanvasTouchEvent = function (e) {
         if (e.type == 'touchstart' && e.targetTouches.length == 1) {
            if (onPanStart(e.targetTouches[0])) {
               utils.cancelEvent(e);
            }
         }
         else if (e.type == 'touchmove' && e.targetTouches.length == 1) {
            if (onPan(e.targetTouches[0])) {
               utils.cancelEvent(e);
            }
         }
         else {
            onPanEnd(e);
         }
      };

      addTouchEvents = function (elem, fn) {
         const types = ['touchstart', 'touchend', 'touchmove', 'touchcancel'];
         for (let i = 0; i < types.length; i++) {
            self.dygraph_.addAndTrackEvent(elem, types[i], fn);
         }
      };

      this.setDefaultOption_('interactionModel', DygraphInteraction.dragIsPanInteractionModel);
      this.setDefaultOption_('panEdgeFraction', 0.0001);

      const dragStartEvent = window.opera ? 'mousedown' : 'dragstart';
      this.dygraph_.addAndTrackEvent(this.leftZoomHandle_, dragStartEvent, onZoomStart);
      this.dygraph_.addAndTrackEvent(this.rightZoomHandle_, dragStartEvent, onZoomStart);

      this.dygraph_.addAndTrackEvent(this.fgcanvas_, 'mousedown', onPanStart);
      this.dygraph_.addAndTrackEvent(this.fgcanvas_, 'mousemove', onCanvasHover);

      // Touch events
      if (this.hasTouchInterface_) {
         addTouchEvents(this.leftZoomHandle_, onZoomHandleTouchEvent);
         addTouchEvents(this.rightZoomHandle_, onZoomHandleTouchEvent);
         addTouchEvents(this.fgcanvas_, onCanvasTouchEvent);
      }
   }

   /**
    * @private
    * Draws the static layer in the background canvas.
    */
   drawStaticLayer_() {
      const ctx = this.bgcanvas_ctx_;
      ctx.clearRect(0, 0, this.canvasRect_.w, this.canvasRect_.h);
      try {
         this.drawMiniPlot_();
      }
      catch (ex) {
         console.warn(ex);
      }

      const margin = 0.5;
      this.bgcanvas_ctx_.lineWidth = this.getOption_('rangeSelectorBackgroundLineWidth');
      ctx.strokeStyle = this.getOption_('rangeSelectorBackgroundStrokeColor');
      ctx.beginPath();
      ctx.moveTo(margin, margin);
      ctx.lineTo(margin, this.canvasRect_.h - margin);
      ctx.lineTo(this.canvasRect_.w - margin, this.canvasRect_.h - margin);
      ctx.lineTo(this.canvasRect_.w - margin, margin);
      ctx.stroke();
   }

   /**
    * @private
    * Draws the mini plot in the background canvas.
    */
   drawMiniPlot_() {
      const fillStyle = this.getOption_('rangeSelectorPlotFillColor');
      const fillGradientStyle = this.getOption_('rangeSelectorPlotFillGradientColor');
      const strokeStyle = this.getOption_('rangeSelectorPlotStrokeColor');
      if (!fillStyle && !strokeStyle) {
         return;
      }

      const stepPlot = this.getOption_('stepPlot');

      const combinedSeriesData = this.computeCombinedSeriesAndLimits_();
      const yRange = combinedSeriesData.yMax - combinedSeriesData.yMin;

      // Draw the mini plot.
      const ctx = this.bgcanvas_ctx_;
      const margin = 0;

      const xExtremes = this.dygraph_.xAxisExtremes();
      const xRange = Math.max(xExtremes[1] - xExtremes[0], 1.e-30);
      const xFact = (this.canvasRect_.w - margin) / xRange;
      const yFact = (this.canvasRect_.h - margin) / yRange;
      const canvasWidth = this.canvasRect_.w - margin;
      const canvasHeight = this.canvasRect_.h - margin;

      let prevX = null;
      let prevY = null;

      ctx.beginPath();
      ctx.moveTo(margin, canvasHeight);
      for (let i = 0; i < combinedSeriesData.data.length; i++) {
         const dataPoint = combinedSeriesData.data[i];
         const x = ((dataPoint[0] !== null) ? ((dataPoint[0] - xExtremes[0]) * xFact) : NaN);
         const y = ((dataPoint[1] !== null) ? (canvasHeight - (dataPoint[1] - combinedSeriesData.yMin) * yFact) : NaN);

         // Skip points that don't change the x-value. Overly fine-grained points
         // can cause major slowdowns with the ctx.fill() call below.
         if (!stepPlot && prevX !== null && Math.round(x) == Math.round(prevX)) {
            continue;
         }

         if (isFinite(x) && isFinite(y)) {
            if (prevX === null) {
               ctx.lineTo(x, canvasHeight);
            }
            else if (stepPlot) {
               ctx.lineTo(x, prevY);
            }
            ctx.lineTo(x, y);
            prevX = x;
            prevY = y;
         }
         else {
            if (prevX !== null) {
               if (stepPlot) {
                  ctx.lineTo(x, prevY);
                  ctx.lineTo(x, canvasHeight);
               }
               else {
                  ctx.lineTo(prevX, canvasHeight);
               }
            }
            prevX = prevY = null;
         }
      }
      ctx.lineTo(canvasWidth, canvasHeight);
      ctx.closePath();

      if (fillStyle) {
         const lingrad = this.bgcanvas_ctx_.createLinearGradient(0, 0, 0, canvasHeight);
         if (fillGradientStyle) {
            lingrad.addColorStop(0, fillGradientStyle);
         }
         lingrad.addColorStop(1, fillStyle);
         this.bgcanvas_ctx_.fillStyle = lingrad;
         ctx.fill();
      }

      if (strokeStyle) {
         this.bgcanvas_ctx_.strokeStyle = strokeStyle;
         this.bgcanvas_ctx_.lineWidth = this.getOption_('rangeSelectorPlotLineWidth');
         ctx.stroke();
      }
   }

   /**
    * @private
    * Computes and returns the combined series data along with min/max for the mini plot.
    * The combined series consists of averaged values for all series.
    * When series have error bars, the error bars are ignored.
    * @return {Object} An object containing combined series array, ymin, ymax.
    */
   computeCombinedSeriesAndLimits_() {
      const g = this.dygraph_;
      const logscale = this.getOption_('logscale');
      let i;

      // Select series to combine. By default, all series are combined.
      const numColumns = g.numColumns();
      const labels = g.getLabels();
      const includeSeries = new Array(numColumns);
      let anySet = false;
      const visibility = g.visibility();
      const inclusion = [];

      for (i = 1; i < numColumns; i++) {
         const include = this.getOption_('showInRangeSelector', labels[i]);
         inclusion.push(include);
         if (include !== null) anySet = true; // it's set explicitly for this series
      }

      if (anySet) {
         for (i = 1; i < numColumns; i++) {
            includeSeries[i] = inclusion[i - 1];
         }
      }
      else {
         for (i = 1; i < numColumns; i++) {
            includeSeries[i] = visibility[i - 1];
         }
      }

      // Create a combined series (average of selected series values).
      // TODO(danvk): short-circuit if there's only one series.
      const rolledSeries = [];
      const dataHandler = g.dataHandler_;
      const options = g.attributes_;
      for (i = 1; i < g.numColumns(); i++) {
         if (!includeSeries[i]) continue;
         let series = dataHandler.extractSeries(g.rawData_, i, options);
         if (g.rollPeriod() > 1) {
            series = dataHandler.rollingAverage(series, g.rollPeriod(), options);
         }

         rolledSeries.push(series);
      }

      const combinedSeries = [];
      for (i = 0; i < rolledSeries[0].length; i++) {
         let sum = 0;
         let count = 0;
         for (let j = 0; j < rolledSeries.length; j++) {
            const y = rolledSeries[j][i][1];
            if (y === null || isNaN(y)) continue;
            count++;
            sum += y;
         }
         combinedSeries.push([rolledSeries[0][i][0], sum / count]);
      }

      // Compute the y range.
      let yMin = Number.MAX_VALUE;
      let yMax = -Number.MAX_VALUE;
      for (i = 0; i < combinedSeries.length; i++) {
         const yVal = combinedSeries[i][1];
         if (yVal !== null && isFinite(yVal) && (!logscale || yVal > 0)) {
            yMin = Math.min(yMin, yVal);
            yMax = Math.max(yMax, yVal);
         }
      }

      // Convert Y data to log scale if needed.
      // Also, expand the Y range to compress the mini plot a little.
      const extraPercent = 0.25;
      if (logscale) {
         yMax = utils.log10(yMax);
         yMax += yMax * extraPercent;
         yMin = utils.log10(yMin);
         for (i = 0; i < combinedSeries.length; i++) {
            combinedSeries[i][1] = utils.log10(combinedSeries[i][1]);
         }
      }
      else {
         let yExtra;
         const yRange = yMax - yMin;
         if (yRange <= Number.MIN_VALUE) {
            yExtra = yMax * extraPercent;
         }
         else {
            yExtra = yRange * extraPercent;
         }
         yMax += yExtra;
         yMin -= yExtra;
      }

      return { data: combinedSeries, yMin, yMax };
   }

   /**
    * @private
    * Places the zoom handles in the proper position based on the current X data window.
    */
   placeZoomHandles_() {
      const xExtremes = this.dygraph_.xAxisExtremes();
      const xWindowLimits = this.dygraph_.xAxisRange();
      const xRange = xExtremes[1] - xExtremes[0];
      const leftPercent = Math.max(0, (xWindowLimits[0] - xExtremes[0]) / xRange);
      const rightPercent = Math.max(0, (xExtremes[1] - xWindowLimits[1]) / xRange);
      const leftCoord = this.canvasRect_.x + this.canvasRect_.w * leftPercent;
      const rightCoord = this.canvasRect_.x + this.canvasRect_.w * (1 - rightPercent);
      // const handleTop = Math.max(this.canvasRect_.y, this.canvasRect_.y + (this.canvasRect_.h - this.leftZoomHandleHeight) / 2);
      const halfHandleWidth = this.leftZoomHandleWidth / 2;
      this.leftZoomHandle_.style.left = `${leftCoord - halfHandleWidth}px`;
      // this.leftZoomHandle_.style.top = `${handleTop}px`;
      this.rightZoomHandle_.style.left = `${rightCoord - halfHandleWidth}px`;
      // this.rightZoomHandle_.style.top = this.leftZoomHandle_.style.top;

      this.leftZoomHandle_.style.visibility = 'visible';
      this.rightZoomHandle_.style.visibility = 'visible';
   }

   /**
    * @private
    * Draws the interactive layer in the foreground canvas.
    */
   drawInteractiveLayer_() {
      const ctx = this.fgcanvas_ctx_;
      ctx.clearRect(0, 0, this.canvasRect_.w, this.canvasRect_.h);
      const margin = -1;
      const width = this.canvasRect_.w - margin;
      const height = this.canvasRect_.h - margin;
      const zoomHandleStatus = this.getZoomHandleStatus_();

      ctx.strokeStyle = this.getOption_('rangeSelectorForegroundStrokeColor');
      ctx.lineWidth = this.getOption_('rangeSelectorForegroundLineWidth');
      if (!zoomHandleStatus.isZoomed) {
         ctx.beginPath();
         ctx.moveTo(margin, margin);
         ctx.lineTo(margin, height);
         ctx.lineTo(width, height);
         ctx.lineTo(width, margin);
         ctx.stroke();
      }
      else {
         const leftHandleCanvasPos = Math.max(margin, zoomHandleStatus.leftHandlePos - this.canvasRect_.x);
         const rightHandleCanvasPos = Math.min(width, zoomHandleStatus.rightHandlePos - this.canvasRect_.x);

         ctx.fillStyle = `rgba(240, 240, 240, ${this.getOption_('rangeSelectorAlpha').toString()})`;
         ctx.fillRect(0, 0, leftHandleCanvasPos, this.canvasRect_.h);
         ctx.fillRect(rightHandleCanvasPos, 0, this.canvasRect_.w - rightHandleCanvasPos, this.canvasRect_.h);

         ctx.beginPath();
         ctx.moveTo(margin, margin);
         ctx.lineTo(leftHandleCanvasPos, margin);
         ctx.lineTo(leftHandleCanvasPos, height);
         ctx.lineTo(rightHandleCanvasPos, height);
         ctx.lineTo(rightHandleCanvasPos, margin);
         ctx.lineTo(width, margin);
         ctx.stroke();
      }
   }

   /**
    * @private
    * Returns the current zoom handle position information.
    * @return {Object} The zoom handle status.
    */
   getZoomHandleStatus_() {
      const halfHandleWidth = this.leftZoomHandle_.width / 2;
      const leftHandlePos = parseFloat(this.leftZoomHandle_.style.left) + halfHandleWidth;
      const rightHandlePos = parseFloat(this.rightZoomHandle_.style.left) + halfHandleWidth;
      return {
         leftHandlePos,
         rightHandlePos,
         isZoomed: (leftHandlePos - 1 > this.canvasRect_.x || rightHandlePos + 1 < this.canvasRect_.x + this.canvasRect_.w),
      };
   }
}

export default rangeSelector;
