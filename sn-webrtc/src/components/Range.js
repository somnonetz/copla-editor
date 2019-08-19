import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dygraph from '../dygraphs/dygraph';

export default class Range extends Component {
  static propTypes = {
    start: PropTypes.instanceOf(Date).isRequired,
    end: PropTypes.instanceOf(Date).isRequired,
    dateWindow: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  componentDidMount() {
    const rangeHeight = this.container.offsetHeight;
    this.range = new Dygraph(
      this.container,
      [[this.props.start, 0], [this.props.end, 0]],
      {
        dateWindow: this.props.dateWindow,
        xAxisHeight: rangeHeight,
        labels: ['Time', 'Value'],
        showLabelsOnHighlight: false,
        showRangeSelector: true,
        rangeSelectorHeight: rangeHeight,
        rangeSelectorAlpha: 1,
        // underlayCallback: this.checkIfBufferIsSufficient,
        // underlayCallback: console.log.bind(console, 'underlayCallback'),
        // zoomCallback: console.log, // -> zoom per handle
        drawCallback: this.handleRangeMovement, // -> zoom per handle
      },
    );
    this.range.name = 'Range'; // for debugging
    this.range.draw = this.range.drawGraph_.bind(this.range);
  }

  componentDidUpdate(prevProps) {
    if (this.props.dateWindow !== prevProps.dateWindow) {
      this.range.dateWindow_ = this.props.dateWindow;
      this.range.draw();
    }

    // this.graph.updateOptions(updateAttrs);
  }

  handleRangeMovement = range => {
    if (!range.draw) return; // not yet ready
    const [newLeft, newRight] = range.dateWindow_;
    this.props.onChange(newLeft, newRight);
  };

  render() {
    const ref = el => (this.container = el);
    const style = { height: 30, width: '100%' };
    return <div ref={ref} style={style} className="range" />;
  }
}
