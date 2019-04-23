/**
 * @license
 * Copyright 2012 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/**
Current bits of jankiness:
- Uses dygraph.layout_ to get the parsed annotations.
- Uses dygraph.plotter_.area

It would be nice if the plugin didn't require so much special support inside
the core dygraphs classes, but annotations involve quite a bit of parsing and
layout.

TODO(danvk): cache DOM elements.
*/

class annotations {
  constructor() {
    this.annotations_ = [];
  }

  toString() {
    return 'Annotations Plugin';
  }

  activate(g) {
    return {
      clearChart: this.clearChart,
      didDrawChart: this.didDrawChart,
    };
  }

  detachLabels() {
    for (let i = 0; i < this.annotations_.length; i++) {
      const a = this.annotations_[i];
      if (a.parentNode) a.parentNode.removeChild(a);
      this.annotations_[i] = null;
    }
    this.annotations_ = [];
  }

  clearChart(e) {
    this.detachLabels();
  }

  didDrawChart(e) {
    const g = e.dygraph;

    // Early out in the (common) case of zero annotations.
    const points = g.layout_.annotated_points;
    if (!points || points.length === 0) return;

    const containerDiv = e.canvas.parentNode;

    const bindEvt = function (eventName, classEventName, pt) {
      return function (annotation_event) {
        const a = pt.annotation;
        if (a.hasOwnProperty(eventName)) {
          a[eventName](a, pt, g, annotation_event);
        }
        else if (g.getOption(classEventName)) {
          g.getOption(classEventName)(a, pt, g, annotation_event);
        }
      };
    };

      // Add the annotations one-by-one.
    const area = e.dygraph.getArea();

    // x-coord to sum of previous annotation's heights (used for stacking).
    const xToUsedHeight = {};

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.canvasx < area.x || p.canvasx > area.x + area.w ||
           p.canvasy < area.y || p.canvasy > area.y + area.h) {
        continue;
      }

      const a = p.annotation;
      let tick_height = 6;
      if (a.hasOwnProperty('tickHeight')) {
        tick_height = a.tickHeight;
      }

      // TODO: deprecate axisLabelFontSize in favor of CSS
      const div = document.createElement('div');
      div.style.fontSize = `${g.getOption('axisLabelFontSize')}px`;
      let className = 'dygraph-annotation';
      if (!a.hasOwnProperty('icon')) {
        // camelCase class names are deprecated.
        className += ' dygraphDefaultAnnotation dygraph-default-annotation';
      }
      if (a.hasOwnProperty('cssClass')) {
        className += ` ${a.cssClass}`;
      }
      div.className = className;

      const width = a.hasOwnProperty('width') ? a.width : 16;
      const height = a.hasOwnProperty('height') ? a.height : 16;
      if (a.hasOwnProperty('icon')) {
        const img = document.createElement('img');
        img.src = a.icon;
        img.width = width;
        img.height = height;
        div.appendChild(img);
      }
      else if (p.annotation.hasOwnProperty('shortText')) {
        div.appendChild(document.createTextNode(p.annotation.shortText));
      }
      const left = p.canvasx - width / 2;
      div.style.left = `${left}px`;
      let divTop = 0;
      if (a.attachAtBottom) {
        let y = (area.y + area.h - height - tick_height);
        if (xToUsedHeight[left]) {
          y -= xToUsedHeight[left];
        }
        else {
          xToUsedHeight[left] = 0;
        }
        xToUsedHeight[left] += (tick_height + height);
        divTop = y;
      }
      else {
        divTop = p.canvasy - height - tick_height;
      }
      div.style.top = `${divTop}px`;
      div.style.width = `${width}px`;
      div.style.height = `${height}px`;
      div.title = p.annotation.text;
      div.style.color = g.colorsMap_[p.name];
      div.style.borderColor = g.colorsMap_[p.name];
      a.div = div;

      g.addAndTrackEvent(div, 'click',
        bindEvt('clickHandler', 'annotationClickHandler', p, this));
      g.addAndTrackEvent(div, 'mouseover',
        bindEvt('mouseOverHandler', 'annotationMouseOverHandler', p, this));
      g.addAndTrackEvent(div, 'mouseout',
        bindEvt('mouseOutHandler', 'annotationMouseOutHandler', p, this));
      g.addAndTrackEvent(div, 'dblclick',
        bindEvt('dblClickHandler', 'annotationDblClickHandler', p, this));

      containerDiv.appendChild(div);
      this.annotations_.push(div);

      const ctx = e.drawingContext;
      ctx.save();
      ctx.strokeStyle = a.hasOwnProperty('tickColor') ? a.tickColor : g.colorsMap_[p.name];
      ctx.lineWidth = a.hasOwnProperty('tickWidth') ? a.tickWidth : g.getOption('strokeWidth');
      ctx.beginPath();
      if (!a.attachAtBottom) {
        ctx.moveTo(p.canvasx, p.canvasy);
        ctx.lineTo(p.canvasx, p.canvasy - 2 - tick_height);
      }
      else {
        const y = divTop + height;
        ctx.moveTo(p.canvasx, y);
        ctx.lineTo(p.canvasx, y + tick_height);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  destroy() {
    this.detachLabels();
  }
}

export default annotations;
