/**
 * @license
 * Copyright 2013 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 *
 * Note: This plugin requires jQuery and jQuery UI Draggable.
 *
 * See high-level documentation at
 * https://docs.google.com/document/d/1OHNE8BNNmMtFlRQ969DACIYIJ9VVJ7w3dSPRJDEeIew/edit#
 */

/* global Dygraph:false */

Dygraph.Plugins.SuperAnnotations = (function () {
  /**
 * These are just the basic requirements -- annotations can have whatever other
 * properties the code that displays them wants them to have.
 *
 * @typedef {
 *   xval:  number,      // x-value (i.e. millis or a raw number)
 *   series: string,     // series name
 *   yFrac: ?number,     // y-positioning. Default is a few px above the point.
 *   lineDiv: !Element   // vertical div connecting point to info div.
 *   infoDiv: !Element   // div containing info about the annotation.
 * } Annotation
 */

  class annotations {
    constructor(opt_options) {
      /* @type {!Array.<!Annotation>} */
      this.annotations_ = [];
      // Used to detect resizes (which require the divs to be repositioned).
      this.lastWidth_ = -1;
      this.lastHeight = -1;
      this.dygraph_ = null;

      opt_options = opt_options || {};
      this.defaultAnnotationProperties_ = $.extend({
        text: 'Description',
      }, opt_options.defaultAnnotationProperties);
    }

    toString() {
      return 'SuperAnnotations Plugin';
    }

    activate(g) {
      this.dygraph_ = g;
      this.annotations_ = [];

      return {
        didDrawChart: this.didDrawChart,
        pointClick: this.pointClick, // TODO(danvk): implement in dygraphs
      };
    }

    detachLabels() {
      for (let i = 0; i < this.annotations_.length; i++) {
        const a = this.annotations_[i];
        $(a.lineDiv).remove();
        $(a.infoDiv).remove();
        this.annotations_[i] = null;
      }
      this.annotations_ = [];
    }

    annotationWasDragged(a, event, ui) {
      const g = this.dygraph_;
      const area = g.getArea();
      const oldYFrac = a.yFrac;

      const infoDiv = a.infoDiv;
      const newYFrac = ((infoDiv.offsetTop + infoDiv.offsetHeight) - area.y) / area.h;
      if (newYFrac == oldYFrac) return;

      a.yFrac = newYFrac;

      this.moveAnnotationToTop(a);
      this.updateAnnotationDivPositions();
      this.updateAnnotationInfo();
      $(this).triggerHandler('annotationMoved', {
        annotation: a,
        oldYFrac,
        newYFrac: a.yFrac,
      });
      $(this).triggerHandler('annotationsChanged', {});
    }

    makeAnnotationEditable(a) {
      if (a.editable == true) return;
      this.moveAnnotationToTop(a);

      // Note: we have to fill out the HTML ourselves because
      // updateAnnotationInfo() won't touch editable annotations.
      a.editable = true;
      const editableTemplateDiv = $('#annotation-editable-template').get(0);
      a.infoDiv.innerHTML = this.getTemplateHTML(editableTemplateDiv, a);
      $(a.infoDiv).toggleClass('editable', !!a.editable);
      $(this).triggerHandler('beganEditAnnotation', a);
    }

    // This creates the hairline object and returns it.
    // It does not position it and does not attach it to the chart.
    createAnnotation(a) {
      const self = this;

      const color = this.getColorForSeries_(a.series);

      const $lineDiv = $('<div/>').css({
        width: '1px',
        left: '3px',
        background: 'black',
        height: '100%',
        position: 'absolute',
        // TODO(danvk): use border-color here for consistency?
        'background-color': color,
        'z-index': 10,
      }).addClass('dygraph-annotation-line');

      const $infoDiv = $('#annotation-template').clone().removeAttr('id').css({
        position: 'absolute',
        'border-color': color,
        'z-index': 10,
      })
        .show();

      $.extend(a, {
        lineDiv: $lineDiv.get(0),
        infoDiv: $infoDiv.get(0),
      });

      const that = this;

      $infoDiv.draggable({
        start(event, ui) {
          $(this).css({ bottom: '' });
          a.isDragging = true;
        },
        drag(event, ui) {
          self.annotationWasDragged(a, event, ui);
        },
        stop(event, ui) {
          $(this).css({ top: '' });
          a.isDragging = false;
          self.updateAnnotationDivPositions();
        },
        axis: 'y',
        containment: 'parent',
      });

      // TODO(danvk): use 'on' instead of delegate/dblclick
      $infoDiv.on('click', '.annotation-kill-button', () => {
        that.removeAnnotation(a);
        $(that).triggerHandler('annotationDeleted', a);
        $(that).triggerHandler('annotationsChanged', {});
      });

      $infoDiv.on('dblclick', () => {
        that.makeAnnotationEditable(a);
      });
      $infoDiv.on('click', '.annotation-update', () => {
        self.extractUpdatedProperties_($infoDiv.get(0), a);
        a.editable = false;
        self.updateAnnotationInfo();
        $(that).triggerHandler('annotationEdited', a);
        $(that).triggerHandler('annotationsChanged', {});
      });
      $infoDiv.on('click', '.annotation-cancel', () => {
        a.editable = false;
        self.updateAnnotationInfo();
        $(that).triggerHandler('cancelEditAnnotation', a);
      });

      return a;
    }

    // Find the index of a point in a series.
    // Returns a 2-element array, [row, col], which can be used with
    // dygraph.getValue() to get the value at this point.
    // Returns null if there's no match.
    findPointIndex_(series, xval) {
      const col = this.dygraph_.getLabels().indexOf(series);
      if (col == -1) return null;

      let lowIdx = 0;
      let highIdx = this.dygraph_.numRows() - 1;
      while (lowIdx <= highIdx) {
        const idx = Math.floor((lowIdx + highIdx) / 2);
        const xAtIdx = this.dygraph_.getValue(idx, 0);
        if (xAtIdx == xval) {
          return [idx, col];
        }
        else if (xAtIdx < xval) {
          lowIdx = idx + 1;
        }
        else {
          highIdx = idx - 1;
        }
      }
      return null;
    }

    getColorForSeries_(series) {
      const colors = this.dygraph_.getColors();
      const col = this.dygraph_.getLabels().indexOf(series);
      if (col == -1) return null;

      return colors[(col - 1) % colors.length];
    }

    // Moves a hairline's divs to the top of the z-ordering.
    moveAnnotationToTop(a) {
      const div = this.dygraph_.graphDiv;
      $(a.infoDiv).appendTo(div);
      $(a.lineDiv).appendTo(div);

      const idx = this.annotations_.indexOf(a);
      this.annotations_.splice(idx, 1);
      this.annotations_.push(a);
    }

    // Positions existing hairline divs.
    updateAnnotationDivPositions() {
      const layout = this.dygraph_.getArea();
      const chartLeft = layout.x;
      const chartRight = layout.x + layout.w;
      const chartTop = layout.y;
      const chartBottom = layout.y + layout.h;
      const div = this.dygraph_.graphDiv;
      const pos = Dygraph.findPos(div);
      const box = [layout.x + pos.x, layout.y + pos.y];
      box.push(box[0] + layout.w);
      box.push(box[1] + layout.h);

      const g = this.dygraph_;

      const that = this;
      $.each(this.annotations_, (idx, a) => {
        const row_col = that.findPointIndex_(a.series, a.xval);
        if (row_col == null) {
          $([a.lineDiv, a.infoDiv]).hide();
          return;
        }
        // TODO(danvk): only do this if they're invisible?
        $([a.lineDiv, a.infoDiv]).show();

        const xy = g.toDomCoords(a.xval, g.getValue(row_col[0], row_col[1]));
        const x = xy[0];
        const pointY = xy[1];

        var lineHeight = 6; // TODO(danvk): option?

        let y = pointY;
        if (a.yFrac !== undefined) {
          y = layout.y + layout.h * a.yFrac;
        }
        else {
          y -= lineHeight;
        }

        var lineHeight = y < pointY ? (pointY - y) : (y - pointY - a.infoDiv.offsetHeight);
        $(a.lineDiv).css({
          left: `${x}px`,
          top: `${Math.min(y, pointY)}px`,
          height: `${lineHeight}px`,
        });
        $(a.infoDiv).css({
          left: `${x}px`,
        });
        if (!a.isDragging) {
          // jQuery UI draggable likes to set 'top', whereas superannotations sets
          // 'bottom'. Setting both will make the annotation grow and contract as
          // the user drags it, which looks bad.
          $(a.infoDiv).css({
            bottom: `${div.offsetHeight - y}px`,
          }); // .draggable("option", "containment", box);

          const visible = (x >= chartLeft && x <= chartRight) &&
                       (pointY >= chartTop && pointY <= chartBottom);
          $([a.infoDiv, a.lineDiv]).toggle(visible);
        }
      });
    }

    // Fills out the info div based on current coordinates.
    updateAnnotationInfo() {
      const g = this.dygraph_;

      const that = this;
      const templateDiv = $('#annotation-template').get(0);
      $.each(this.annotations_, (idx, a) => {
        // We should never update an editable div -- doing so may kill unsaved
        // edits to an annotation.
        $(a.infoDiv).toggleClass('editable', !!a.editable);
        if (a.editable) return;
        a.infoDiv.innerHTML = that.getTemplateHTML(templateDiv, a);
      });
    }

    /**
    * @param {!Annotation} a Internal annotation
    * @return {!PublicAnnotation} a view of the annotation for the public API.
    */
    createPublicAnnotation_(a, opt_props) {
      const displayAnnotation = $.extend({}, a, opt_props);
      delete displayAnnotation.infoDiv;
      delete displayAnnotation.lineDiv;
      delete displayAnnotation.isDragging;
      delete displayAnnotation.editable;
      return displayAnnotation;
    }

    // Fill out a div using the values in the annotation object.
    // The div's html is expected to have text of the form "{{key}}"
    getTemplateHTML(div, a) {
      const g = this.dygraph_;
      const row_col = this.findPointIndex_(a.series, a.xval);
      if (row_col == null) return; // perhaps it's no longer a real point?
      const row = row_col[0];
      const col = row_col[1];

      const yOptView = g.optionsViewForAxis_('y1'); // TODO: support secondary, too
      const xOptView = g.optionsViewForAxis_('x');
      const xvf = g.getOptionForAxis('valueFormatter', 'x');

      const x = xvf.call(g, a.xval, xOptView);
      const y = g.getOption('valueFormatter', a.series).call(
        g, g.getValue(row, col), yOptView);

      const displayAnnotation = this.createPublicAnnotation_(a, { x, y });
      let html = div.innerHTML;
      for (const k in displayAnnotation) {
        const v = displayAnnotation[k];
        if (typeof (v) === 'object') continue; // e.g. infoDiv or lineDiv
        html = html.replace(new RegExp(`\{\{${k}\}\}`, 'g'), v);
      }
      return html;
    }

    // Update the annotation object by looking for elements with a 'dg-ann-field'
    // attribute. For example, <input type='text' dg-ann-field='text' /> will have
    // its value placed in the 'text' attribute of the annotation.
    extractUpdatedProperties_(div, a) {
      $(div).find('[dg-ann-field]').each((idx, el) => {
        const k = $(el).attr('dg-ann-field');
        const v = $(el).val();
        a[k] = v;
      });
    }

    // After a resize, the hairline divs can get dettached from the chart.
    // This reattaches them.
    attachAnnotationsToChart_() {
      const div = this.dygraph_.graphDiv;
      $.each(this.annotations_, (idx, a) => {
        // Re-attaching an editable div to the DOM can clear its focus.
        // This makes typing really difficult!
        if (a.editable) return;

        $([a.lineDiv, a.infoDiv]).appendTo(div);
      });
    }

    // Deletes a hairline and removes it from the chart.
    removeAnnotation(a) {
      const idx = this.annotations_.indexOf(a);
      if (idx >= 0) {
        this.annotations_.splice(idx, 1);
        $([a.lineDiv, a.infoDiv]).remove();
      }
      else {
        Dygraph.warn('Tried to remove non-existent annotation.');
      }
    }

    didDrawChart(e) {
      const g = e.dygraph;

      // Early out in the (common) case of zero annotations.
      if (this.annotations_.length === 0) return;

      this.updateAnnotationDivPositions();
      this.attachAnnotationsToChart_();
      this.updateAnnotationInfo();
    }

    pointClick(e) {
      // Prevent any other behavior based on this click, e.g. creation of a hairline.
      e.preventDefault();

      const a = $.extend({}, this.defaultAnnotationProperties_, {
        series: e.point.name,
        xval: e.point.xval,
      });
      this.annotations_.push(this.createAnnotation(a));

      this.updateAnnotationDivPositions();
      this.updateAnnotationInfo();
      this.attachAnnotationsToChart_();

      $(this).triggerHandler('annotationCreated', a);
      $(this).triggerHandler('annotationsChanged', {});

      // Annotations should begin life editable.
      this.makeAnnotationEditable(a);
    }

    destroy() {
      this.detachLabels();
    }

    // Public API

    /**
    * This is a restricted view of this.annotations_ which doesn't expose
    * implementation details like the line / info divs.
    *
    * @typedef {
    *   xval:  number,      // x-value (i.e. millis or a raw number)
    *   series: string,     // series name
    * } PublicAnnotation
    */

    /**
    * @return {!Array.<!PublicAnnotation>} The current set of annotations, ordered
    *     from back to front.
    */
    get() {
      const result = [];
      for (let i = 0; i < this.annotations_.length; i++) {
        result.push(this.createPublicAnnotation_(this.annotations_[i]));
      }
      return result;
    }

    /**
    * Calling this will result in an annotationsChanged event being triggered, no
    * matter whether it consists of additions, deletions, moves or no changes at
    * all.
    *
    * @param {!Array.<!PublicAnnotation>} annotations The new set of annotations,
    *     ordered from back to front.
    */
    set(annotations) {
      // Re-use divs from the old annotations array so far as we can.
      // They're already correctly z-ordered.
      let anyCreated = false;
      for (let i = 0; i < annotations.length; i++) {
        const a = annotations[i];

        if (this.annotations_.length > i) {
          // Only the divs need to be preserved.
          const oldA = this.annotations_[i];
          this.annotations_[i] = $.extend({
            infoDiv: oldA.infoDiv,
            lineDiv: oldA.lineDiv,
          }, a);
        }
        else {
          this.annotations_.push(this.createAnnotation(a));
          anyCreated = true;
        }
      }

      // If there are any remaining annotations, destroy them.
      while (annotations.length < this.annotations_.length) {
        this.removeAnnotation(this.annotations_[annotations.length]);
      }

      this.updateAnnotationDivPositions();
      this.updateAnnotationInfo();
      if (anyCreated) {
        this.attachAnnotationsToChart_();
      }

      $(this).triggerHandler('annotationsChanged', {});
    }
  }

  return annotations;
}());
