import { Component } from 'react';
import PropTypes from 'prop-types';

export default class Countdown extends Component {

  static propTypes = {
    seconds: PropTypes.number.isRequired,
    interval: PropTypes.number,
    onTargetReached: PropTypes.func,
  }

  static defaultProps = {
    interval: 1000,
    onTargetReached() {},
  }

  constructor(props) {
    super(props);
    this.state = {
      targetTime: Date.now() + props.seconds * 1000,
      remaining: props.seconds,
    };
  }

  componentDidMount() {
    this.timer = window.setInterval(this.setRemaining, this.props.interval);
  }

  componentWillUnmount() {
    window.clearInterval(this.timer);
  }

  setRemaining = () => {
    const remaining = (this.state.targetTime - Date.now()) / 1000;
    if (remaining <= 0) this.props.onTargetReached();
    else this.setState({ remaining });
  }

  render() {
    const remaining = this.state.remaining | 0;
    const minutes = (remaining / 60) | 0;
    const seconds = (remaining % 60).toFixed(0).padStart(2, '0');

    return `${minutes}:${seconds}`;
  }

}
