import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Dygraph from '../dygraphs/dygraph';

export default class Hypnogram extends Component {
  static propTypes = {
    start: PropTypes.instanceOf(Date).isRequired,
    end: PropTypes.instanceOf(Date).isRequired,
    dateWindow: PropTypes.array.isRequired,
  };

  constructor(props) {
    super(props);

    const { start, end } = this.props;
    const epochs = Math.floor((end - start) / 1000 / 30);
    const data = _.range(epochs).map((ar, i) => [
      new Date(+start + i * 30 * 1000),
      null,
    ]);
    const stages = [[start, 5], ...data, [end, 1]];

    this.state = { stages };
  }

  componentDidMount() {
    this.setupGraph();
    this.attachHandlers();
    this.appendAxis();
  }

  componentDidUpdate(prevProps) {
    if (this.props.dateWindow !== prevProps.dateWindow) {
      this.range.updateOptions({ dateWindow: this.props.dateWindow });
      // update current stage
    }
  }

  componentWillUnmount() {
    this.detachHandlers();
  }

  setupGraph = () => {
    const rangeHeight = this.container.offsetHeight;
    this.range = new Dygraph(this.container, this.state.stages, {
      dateWindow: this.props.dateWindow,
      xAxisHeight: rangeHeight,
      valueRange: [1, 5],
      axes: {
        x: { drawAxis: false },
      },
      showLabelsOnHighlight: false,
      stepPlot: true,
      includeZero: true,
      connectSeparatedPoints: false,
      showRangeSelector: true,
      rangeSelectorHeight: rangeHeight,
      rangeSelectorAlpha: 0,
      rangeSelectorPlotFillGradientColor: 'white',
      rangeSelectorForegroundStrokeColor: 'grey',
      rangeSelectorBackgroundStrokeColor: 'white',
      rangeSelectorPlotFillColor: 'white',
      rangeSelectorPlotStrokeColor: 'black',
      rangeSelectorForegroundLineWidth: 0,
    });
    this.range.name = 'Hypnogram'; // for debugging
    this.range.draw = this.range.drawGraph_.bind(this.range);
  };

  attachHandlers = () => {
    window.addEventListener('keydown', this.handleKeydown);
  };

  detachHandlers = () => {
    window.removeEventListener('keydown', this.handleKeydown);
  };

  handleKeydown = e => {
    const keyMap = {
      8: () => this.setStageForEpoch(null), // delete
      27: () => this.setStageForEpoch(null), // escape
      49: () => this.setStageForEpoch(1),
      50: () => this.setStageForEpoch(2),
      51: () => this.setStageForEpoch(3),
      52: () => this.setStageForEpoch(4),
      53: () => this.setStageForEpoch(5),
    };
    (keyMap[e.which || e.keyCode] || _.noop)();
  };

  appendAxis = () => {
    const xAxis = document.createElement('div');
    xAxis.className = 'dygraph-axis-label';
    xAxis.innerHTML = 'W<br>N1<br>N2<br>N3<br>R';
    this.container.firstChild.appendChild(xAxis);
  };

  setStageForEpoch = newStage => {
    const { stages } = this.state;
    const { start, dateWindow } = this.props;
    const epoch = Math.floor((dateWindow[1] - start) / 1000 / 30);
    // const currentStage = stages[epoch][1];
    // const newStage = Math.min(Math.max(currentStage + stageDiff, 0), 5) || null;
    stages[epoch][1] = newStage;
    this.range.updateOptions({ file: stages });
  };

  render() {
    const ref = el => (this.container = el);
    const style = { height: 100, width: '100%' };
    return <div ref={ref} style={style} className="hypnogram" />;
  }
}
