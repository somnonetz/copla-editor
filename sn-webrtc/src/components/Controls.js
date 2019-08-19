import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class Controls extends Component {
  static propTypes = {
    emitter: PropTypes.object.isRequired,
  };

  state = {
    currentTimeWindow: '30',
  };

  handleClicks = ev => {
    const { action, seconds } = ev.target.dataset;
    this.setState({ currentTimeWindow: seconds });
    this.props.emitter.emit(`l-${action}`, seconds);
  };

  render() {
    const { currentTimeWindow } = this.state;
    const Button = ({ children, action, seconds }) => (
      <button
        onClick={this.handleClicks}
        data-action={action}
        data-seconds={seconds}
        className={seconds === currentTimeWindow ? 'active' : ''}
      >
        {children}
      </button>
    );

    return (
      <span className="controls">
        {/*<Button action="moveLeft">←</Button>
        <Button action="moveRight">→</Button>
        <Button action="play">▶</Button>*/}
        {/* <Button action="time" seconds="10">10s</Button> */}
        <Button action="time" seconds="30">
          30s
        </Button>
        {/* <Button action="time" seconds="60">1m</Button> */}
        {/* <Button action="time" seconds="120">2m</Button> */}
        <Button action="time" seconds="300">
          5m
        </Button>
        <Button action="time" seconds="600">
          10m
        </Button>
        <Button action="time" seconds="full">
          full
        </Button>
      </span>
    );
  }
}
