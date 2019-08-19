import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Emitter from 'wildemitter';
import Dygraph from '../dygraphs/dygraph';

export default class Graph extends Component {
  static propTypes = {
    channel: PropTypes.object.isRequired,
    frequency: PropTypes.number,
    height: PropTypes.number,
    data: PropTypes.array,
    artifacts: PropTypes.array,
    dateWindow: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    emitter: PropTypes.object,
  };

  static defaultProps = {
    height: 60,
    data: null,
    frequency: 1,
    artifacts: null,
    emitter: { on() {}, off() {} },
  };

  minHeight = 60;

  componentDidMount() {
    if (this.container) this.createGraph();
  }

  componentDidUpdate(prevProps) {
    if (!this.graph) return;

    if (this.props.dateWindow !== prevProps.dateWindow) {
      this.graph.dateWindow_ = this.props.dateWindow;
      this.redrawGraph();
    }

    if (
      this.props.data !== prevProps.data ||
      this.props.frequency !== prevProps.frequency
    ) {
      this.renderGraph();
      this.redrawGraph();
    }
  }

  componentWillUnmount() {
    if (this.graph) {
      this.observer.unobserve(this.container);
      this.observer = null;
      this.graph.destroy();
      this.graph = null;
    }
  }

  getOptions = () => {
    const { channel, dateWindow, height } = this.props;
    return {
      dateWindow,
      // TODO toggle dynamic range / physical range ???
      height: Math.max(height, this.minHeight),
      valueRange: [
        channel.physicalMinimum - 1, // -1 and +1 so the graph doesn't touch the border and y-labels are correctly drawn
        channel.physicalMaximum + 1,
      ],
      axes: {
        x: {
          drawGrid: false, // show toggle in ui
          drawAxis: false, // i === header.numberOfSignals - 1,
        },
        y: {
          drawGrid: false,
          // drawAxis: false,
        },
      },
      // timingName: `${`${i}`.padStart(2, ' ')} ${header.labels[i].padStart(12, ' ')}`, // log rendering time for debugging
      // connectSeparatedPoints: false // lücken sind ein fehler, der nicht versteckt werden sollte
      // title: header.labels[i], // breaks layout, so we use our own
      strokeWidth: 1.0,
      // rollPeriod: 1, // TODO an "Signaldichte" ausrichten

      errorBars: true, // TODO only when frequency is set
      customBars: true, // TODO only when frequency is set

      showRoller: false, // hides roller input field
      drawPoints: false,
      highlightCircleSize: 2,
      // labelsDiv: this.labelDiv, // TODO
      labels: ['Time', 'Value'],
      ylabel: channel.physicalDimension, // einheit

      interactionModel: {
        wheel: this.handleScrollX,
      },

      legendFormatter: this.legendFormatter,

      // TODO highlightCallback', 'unhighlightCallback' => punkte synchronisieren?

      // zoomCallback() { /* disable (set `valueRange` to initial value) or show reset button */ },
      // disable via: Dygraph.prototype.doZoomY_ = (lowY, highY) => null;
    };
  };

  updateOptions = options => {
    if (!this.graph) return;
    this.graph.updateOptions(options);
    this.renderGraph();
    this.redrawGraph();
  };

  createGraph = () => {
    const { channel, dateWindow } = this.props;
    const options = this.getOptions();
    const value = [
      dateWindow[0],
      [channel.physicalMinimum, 0, channel.physicalMaximum],
    ];
    const graph = new Dygraph(this.container, [value], options);
    graph.name = channel.label;
    graph.draw = graph.drawGraph_.bind(graph);
    graph.cascadeEvents_('clearChart');
    graph.elementsCache = {};

    this.graph = graph;
    this.attachObserver(graph, this.container);
    this.attachPlotbandListeners(graph);
    this.addPlotbands(graph, this.props.artifacts);

    const span = document.createElement('span');
    span.className = 'graph-label';
    span.innerText = channel.standardLabel;
    this.container.append(span);
  };

  addPlotbands(graph, artifacts) {
    if (!artifacts) return;
    artifacts.forEach(({ time, name }) => {
      graph.addBand({
        start: time,
        end: time + 1000,
        note: name,
        isEditable: false,
      });
    });
  }

  legendFormatter = data => {
    if (!data.series || !data.series[0]) return;
    return (data.series[0].y || 0).toFixed(2);
  };

  handleScrollX = event => {
    if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;

    event.preventDefault();

    const delta =
      (-event.wheelDeltaX || event.deltaX) * (100 / this.props.frequency);
    const [windowLeft, windowRight] = this.props.dateWindow;

    this.props.onChange(windowLeft + delta, windowRight + delta);
  };

  attachPlotbandListeners = graph => {
    const { emitter } = this.props;
    const { name } = graph;
    const handle = type => band => {
      const data = band.toJSON();
      emitter.emit('l-band', { type, name, data });
    };

    Emitter.mixin(graph);

    graph.on('bandAdded', handle('added'));
    graph.on('bandChanged', handle('changed'));
    graph.on('bandRemoved', handle('removed'));

    emitter.on('s-band', this.handleBandChange);
  };

  handleBandChange = ({ type, name, data }) => {
    if (this.graph.name !== name) return;

    console.log('handleBandChange', type, name, data);

    if (type === 'removed' || type === 'changed') {
      const band = this.graph.bands.find(band => band.id === data.id);
      if (band) band.destroy(true);
    }

    if (type === 'added' || type === 'changed') {
      data.silent = true;
      this.graph.addBand(data);
    }

    this.graph.draw();
  };

  attachObserver = (graph, container) => {
    const callback = entries => {
      const isVisible = entries[0].isIntersecting;

      if (isVisible && this.props.data) {
        this.renderGraph();
        this.redrawGraph();
      }

      this.setState({ isVisible });
    };
    this.observer = new IntersectionObserver(callback, { threshold: 0 });
    this.observer.observe(container);
  };

  redrawGraph = () => {
    if (this.graph) this.graph.draw();
  };

  renderGraph = () => {
    if (!this.graph || !this.props.data) return;
    this.graph.rolledSeries_[1] = this.props.data;
    this.graph.renderGraph_();
  };

  render() {
    const ref = el => (this.container = el);
    const style = { width: '100%' };
    return <div ref={ref} style={style} />;
  }
}
