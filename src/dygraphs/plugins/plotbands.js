import Band from './band';
import DygraphInteraction from '../dygraph-interaction-model';
import * as utils from '../dygraph-utils';

/**
 * Creates the legend, which appears when the user hovers over the chart.
 * The legend can be either a user-specified or generated div.
 *
 * @constructor
 */
export default class PlotBands {

  minWidth = 15; // minimal width a selection has to have to become a plotband

  constructor() {
    this.interactions = {
      mousedown(event, graph, ctx) {
        ctx.dragEndX = null; // is set on the first click and creates a ghost plotband
        ctx.initializeMouseDown(event, graph, ctx);
      },
      mousemove: DygraphInteraction.moveZoom,
      mouseup: (event, graph, ctx) => {
        graph.clearZoomRect_();
        ctx.isZooming = false;

        const width = Math.abs(ctx.dragEndX - ctx.dragStartX);
        const isHorizontal = ctx.dragDirection === utils.HORIZONTAL;
        const isValid = ctx.dragStartX !== null && ctx.dragEndX !== null;

        if (isValid && isHorizontal && width >= this.minWidth) {
          const plotArea = graph.getArea();
          const left = Math.max(Math.min(ctx.dragStartX, ctx.dragEndX), plotArea.x);
          const right = Math.min(Math.max(ctx.dragStartX, ctx.dragEndX), plotArea.x + plotArea.w);
          this.add(graph, {
            start: graph.toDataXCoord(left),
            end: graph.toDataXCoord(right),
            isEditing: true,
          });
          graph.draw();
          ctx.cancelNextDblclick = true;
        }
        ctx.dragStartX = null;
        ctx.dragStartY = null;
      },
    };
  }

  toString() {
    return 'PlotBands Plugin';
  }

  /**
    * This is called during the dygraph constructor, after options have been set
    * but before the data is available.
    *
    * Proper tasks to do here include:
    * - Reading your own options
    * - DOM manipulation
    * - Registering event listeners
    *
    * @param {Dygraph} g Graph instance.
    * @return {object.<string, function(ev)>} Mapping of event names to callbacks.
    */
  activate(graph) {
    graph.bands = [];
    graph.addBand = this.add.bind(this, graph);

    (graph.getOption('plotBands') || [])
      .forEach(data => graph.bands.push(new Band(Object.assign({ graph }, data))));

    return {
      // predraw: this.predraw,
      // clearChart: this.clearChart,
      select: this.select,
      deselect: this.deselect,
      willDrawChart: this.willDrawChart,
    };
  }

  // predraw(e) {
  //    console.log('predraw');
  // }

  // clearChart() {
  //    console.log('clearChart');
  // }

  select({ dygraph, selectedX }) {
    dygraph.bands.forEach(band => band.onSelect(selectedX));
  }

  deselect({ dygraph }) {
    dygraph.bands.forEach(band => band.onDeselect());
  }

  willDrawChart({ dygraph, drawingContext }) {
    dygraph.bands.forEach(band => band.onWillDraw(drawingContext));
  }

  add(graph, options) {
    options.graph = graph;
    const band = new Band(options);
    graph.bands.push(band);
  }

  /**
    * Called when dygraph.destroy() is called.
    * You should null out any references and detach any DOM elements.
    */
  destroy() {
    // TODO
  }
}
