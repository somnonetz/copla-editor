import { Component } from 'react';
import PropTypes from 'prop-types';

export default class extends Component {

  static propTypes = {
    delay: PropTypes.number.isRequired,
    interval: PropTypes.number,
    onTargetReached: PropTypes.func,
  }

  static defaultProps = {
    interval: 1000,
    onTargetReached: {},
  }

  constructor(props) {
    super(props);
    this.state = {
      targetTime: Date.now() + this.props.delay * 1000,
    };
  }

  componentDidMount() {
    this.timer = window.setInterval(() => this.forceUpdate(), this.props.interval);
  }

  componentWillUnmount() {
    window.clearInterval(this.timer);
  }

  render() {
    const remaining = (this.state.targetTime - Date.now()) / 1000;

    if (remaining <= 0) this.onTargetReached();

    const minutes = Math.floor(remaining / 60).toString();
    const seconds = (remaining % 60).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  }

}
