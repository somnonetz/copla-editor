import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dygraph from '../dygraphs/dygraph';

const blacklist = ['-'];

export default class extends Component {

  static propTypes = {
    channel: PropTypes.object.isRequired,
    frequency: PropTypes.number,
    data: PropTypes.array,
    dateWindow: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
  }

  defaultProps = {
    data: null,
    frequency: 1,
    artifacts: null,
  }

  constructor(props) {
    super(props);
    this.state = {
      isHidden: blacklist.includes(props.channel.label),
    };
  }

  componentDidMount() {
    if (this.container) this.createGraph();
  }

  componentDidUpdate(prevProps) {
    if (!this.graph) return;

    if (this.props.dateWindow !== prevProps.dateWindow) {
      this.graph.dateWindow_ = this.props.dateWindow;
      this.redrawGraph();
    }

    if (this.props.data !== prevProps.data || this.props.frequency !== prevProps.frequency) {
      this.renderGraph();
      this.redrawGraph();
    }
  }

  componentWillUnmount() {
    if (this.graph) {
      this.graph.destroy();
      this.graph = null;
    }
  }

  getOptions = () => {
    const { channel, dateWindow } = this.props;
    return {
      dateWindow,
      // TODO toggle dynamic range / physical range ???
      height: 150,
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

      // TODO highlightCallback', 'unhighlightCallback' => punkte synchronisieren?

      // zoomCallback() { /* disable (set `valueRange` to initial value) or show reset button */ },
      // disable via: Dygraph.prototype.doZoomY_ = (lowY, highY) => null;
    };
  }

  updateOptions = (options) => {
    if (!this.graph) return;
    this.graph.updateOptions(options);
    this.renderGraph();
    this.redrawGraph();
  }

  createGraph = () => {
    const { channel, dateWindow } = this.props;
    const options = this.getOptions();
    const value = [dateWindow[0], [channel.physicalMinimum, 0, channel.physicalMaximum]];
    const graph = new Dygraph(this.container, [value], options);
    graph.name = channel.label;
    graph.draw = graph.drawGraph_.bind(graph);
    graph.cascadeEvents_('clearChart');
    graph.elementsCache = {};

    this.graph = graph;
    this.attachObserver(graph, this.container);

    const span = document.createElement('span');
    span.className = 'graph-label';
    span.innerText = channel.label;
    this.container.append(span);
  }

  handleScrollX = (event) => {
    if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;

    event.preventDefault();

    const delta = (-event.wheelDeltaX || event.deltaX) * (100 / this.props.frequency);
    const [windowLeft, windowRight] = this.props.dateWindow;

    this.props.onChange(windowLeft + delta, windowRight + delta);
  }

  attachObserver = (graph, container) => {
    const callback = (entries) => {
      const isVisible = entries[0].isIntersecting;

      if (isVisible && this.props.data) {
        this.renderGraph();
        this.redrawGraph();
      }

      this.setState({ isVisible });
    };
    const options = { threshold: 0 };
    new window.IntersectionObserver(callback, options).observe(container);
  }

  redrawGraph = () => {
    if (this.graph) this.graph.draw();
  }

  renderGraph = () => {
    if (!this.graph || !this.props.data) return;
    this.graph.rolledSeries_[1] = this.props.data;
    this.graph.renderGraph_();
  }

  render() {
    if (this.state.isHidden) return null;

    const ref = el => this.container = el;
    const style = { width: '100%' };
    return <div ref={ref} style={style} />;
  }

}
