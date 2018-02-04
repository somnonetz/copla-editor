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
    this.timer = window.setInterval(this.setRemaining, this.props.interval);
  }

  componentWillUnmount() {
    window.clearInterval(this.timer);
  }

  setRemaining = () => {
    const remaining = (this.state.targetTime - Date.now()) / 1000;
    if (remaining <= 0) this.onTargetReached();
    else this.setState({ remaining });
  }

  render() {
    const minutes = (this.state.remaining / 60).toFixed(0);
    const seconds = (this.state.remaining % 60).toFixed(0).padStart(2, '0');

    return `${minutes}:${seconds}`;
  }

}
