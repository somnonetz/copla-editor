import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class Controls extends Component {

  static propTypes = {
    proxy: PropTypes.object.isRequired,
  }

  handleClicks = async (ev) => {
    this.props.proxy.onClick(ev.target.dataset);
  }

  render() {
    const Button = ({ children, action, seconds }) => (
      <button
        className="btn btn-default btn-ghost"
        onClick={this.handleClicks}
        data-action={action}
        data-seconds={seconds}
      >{children}</button>
    );

    return (
      <div className="controls site-nav btn-group m-l-1">
        <Button action="moveLeft">←</Button>
        <Button action="moveRight">→</Button>
        <Button action="play">▶</Button>
        {/* <Button action="time" seconds="10">10s</Button> */}
        <Button action="time" seconds="30">30s</Button>
        {/* <Button action="time" seconds="60">1m</Button> */}
        {/* <Button action="time" seconds="120">2m</Button> */}
        <Button action="time" seconds="300">5m</Button>
        <Button action="time" seconds="600">10m</Button>
        <Button action="time" seconds="full">full</Button>
        <Button action="saveAnnotation">Save Annotation</Button>
      </div>
    );
  }

}
