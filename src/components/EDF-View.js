import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Graph from 'components/Graph';
import Range from 'components/Range';

const time = date => new Date(date).toLocaleTimeString().replace(' AM', '');

export default class extends Component {

  static propTypes = {
    edf: PropTypes.object.isRequired,
    artifacts: PropTypes.object,
    controls: PropTypes.object,
  }

  static defaultProps = {
    artifacts: {},
    controls: { onClick() {} },
  }

  state = {
    dateWindow: [0, 0],
    frequency: 1,
    data: [],
    bufferRange: [0, 0],
  }

  initialWindowWidth = 30 * 1000
  chunkWidth = 300 * 1000 // 5min / unabhängig von Frequenz, weil feste Datenmenge geladen wird, auch wenn danach Reduktion
  isLoading = false

  constructor(props) {
    super(props);

    this.handleResize = _.debounce(this.setFrequency, 50);
    this.setStateAsync = state => new Promise(resolve => this.setState(state, resolve));
    props.controls.onClick = this.handleClick;
  }

  async componentDidMount() {
    const header = await this.props.edf.readHeader();
    const dateWindow = [+header.start, +header.start + this.initialWindowWidth];

    this.attachHandlers();

    await this.setStateAsync({ dateWindow });
    await this.setFrequency();

    this.loadData(...dateWindow); // load visible area only -- less data but faster
    // this.loadData(start, start + this.chunkWidth); // buffer -- more data but slower
  }

  componentWillUnmount() {
    this.detachHandlers();
  }

  attachHandlers = () => {
    window.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('resize', this.handleResize);
  }

  detachHandlers = () => {
    window.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('resize', this.handleResize);
  }

  handleKeydown = (e) => {
    const keyMap = {
      37: this.moveLeft,
      39: this.moveRight,
    };
    (keyMap[e.which || e.keyCode] || _.noop)();
  }

  handleClick = ({ action, seconds }) => {
    switch (action) {
      case 'analyze':

        break;
      case 'moveLeft':
        this.moveLeft();
        break;
      case 'moveRight':
        this.moveRight();
        break;
      case 'play':
        this.togglePlay();
        break;
      case 'time':
        this.handleTimeButtons(seconds);
        break;
      default: break;
    }
  }

  handleTimeButtons = (seconds) => {
    if (seconds === 'full') {
      const { start, end } = this.props.edf.header;
      this.updateDateWindow(+start, +end);
    }
    else {
      // TODO lieber "mittig" herauszoomen?
      const [windowLeft] = this.state.dateWindow;
      this.updateDateWindow(windowLeft, windowLeft + seconds * 1000);
    }
  }

  moveLeft = () => {
    const [windowLeft, windowRight] = this.state.dateWindow;
    const windowWidth = windowRight - windowLeft;
    this.updateDateWindow(windowLeft - windowWidth, windowRight - windowWidth);
  }

  moveRight = () => {
    const [windowLeft, windowRight] = this.state.dateWindow;
    const windowWidth = windowRight - windowLeft;
    this.updateDateWindow(windowLeft + windowWidth, windowRight + windowWidth);
  }

  setFrequency = async () => {
    const windowWidth = (this.state.dateWindow[1] - this.state.dateWindow[0]) / 1000; // in seconds
    const graphWidth = this.container.offsetWidth - 85; // in pixel
    const frequency = graphWidth / windowWidth;
    this.setStateAsync({ frequency });
  }

  shouldBufferBeAppended = () => {
    const { start, end } = this.props.edf.header;
    const [windowLeft, windowRight] = this.state.dateWindow;
    const [bufferLeft, bufferRight] = this.state.bufferRange;
    const edfLength = end - start;
    const windowWidth = windowRight - windowLeft;
    const bufferWidth = bufferRight - bufferLeft;

    const minWidth = Math.max(windowWidth, this.chunkWidth) * 4; // buffer at least 4 window sizes
    const maxWidth = Math.min(minWidth, edfLength); // … but not more than the whole file

    return bufferWidth <= maxWidth;
  }

  updateDateWindow = async (newLeft, newRight) => {
    const [windowLeft, windowRight] = this.state.dateWindow;
    const { start, end } = this.props.edf.header;

    if (newLeft === windowLeft && newRight === windowRight) return; // nothing changed

    const windowWidth = windowRight - windowLeft;
    const newWidth = newRight - newLeft;
    let dateWindow = [];

    if (newLeft < start) {
      dateWindow = [+start, +start + newWidth];
    }
    else if (newRight > end) {
      dateWindow = [+end - newWidth, +end];
    }
    else {
      dateWindow = [newLeft, newRight];
    }

    await this.setState({ dateWindow });

    if (newWidth === windowWidth) {
      this.checkIfBufferIsSufficient();
    }
    else { // zoomed
      await this.setFrequency();
      this.loadData(newLeft, newRight);
    }
  }

  checkIfBufferIsSufficient = () => {
    if (!this.state.data) return; // no data yet
    if (this.isLoading) return; // can't load now anyway

    const { start, end } = this.props.edf.header;
    const [windowLeft, windowRight] = this.state.dateWindow;
    const [bufferLeft, bufferRight] = this.state.bufferRange;
    const windowWidth = windowRight - windowLeft;

    // prefer right side as it's the normal reading direction
    if (bufferRight < (windowRight + windowWidth) && bufferRight < end) {
      this.loadData(bufferRight + 1, bufferRight + this.chunkWidth, 'right');
    }
    else if (bufferLeft > (windowLeft - windowWidth) && bufferLeft > start) {
      this.loadData(bufferLeft - this.chunkWidth, bufferLeft - 1, 'left');
    }
  }

  loadData = async (rawLeft, rawRight, direction) => {
    if (this.isLoading) return; // the scroll event might trigger this too often
    this.isLoading = true;

    const { start, end, numberOfSignals } = this.props.edf.header;
    const left = Math.max(rawLeft, +start);
    const right = Math.min(rawRight, +end);
    const from = left - start; // getData needs relative positions
    const till = right - start;
    const shouldAppend = this.shouldBufferBeAppended();
    const loop = (callback) => { for (let i = 0; i < numberOfSignals; i++) callback(i); };

    let { data, bufferRange, frequency } = this.state;
    const newData = await this.props.edf.getData({ from, till, frequency });

    if (!direction) { // overwrite data
      data = newData;
      bufferRange = [left, right];
    }
    else if (direction === 'left') {
      if (shouldAppend) {
        loop(i => data[i] = [...newData[i], ...data[i]]);
        bufferRange[0] = left;
      } else {
        loop(i => data[i] = [...newData[i], ...data[i].slice(0, -newData[i].length)]);
        bufferRange = bufferRange.map(i => i - this.chunkWidth);
      }
    }
    else if (direction === 'right') {
      if (shouldAppend) {
        loop(i => data[i] = [...data[i], ...newData[i]]);
        bufferRange[1] = right;
      } else {
        loop(i => data[i] = [...data[i].slice(newData[i].length), ...newData[i]]);
        bufferRange = bufferRange.map(i => i + this.chunkWidth);
      }
    }

    console.log('\tupdate | buffer is', { left: time(bufferRange[0]), right: time(bufferRange[1]) });

    await this.setStateAsync({ data, bufferRange });
    this.isLoading = false;
    this.checkIfBufferIsSufficient();
  }

  togglePlay = () => {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) this.play();
  }

  play = () => {
    if (!this.isPlaying) return;
    const [windowLeft, windowRight] = this.state.dateWindow;
    const stepWidth = (windowRight - windowLeft) / 25; // move 20% per frame
    this.updateDateWindow(windowLeft + stepWidth, windowRight + stepWidth);
    window.setTimeout(this.play, 100);
  }

  renderGraphs = () => {
    const { dateWindow, frequency, data = [] } = this.state;
    const header = this.props.edf.header;
    const artifacts = _.get(this.props, 'artifacts.data', {});

    return [
      <Range
        key="range"
        start={header.start}
        end={header.end}
        dateWindow={this.state.dateWindow}
        onChange={this.updateDateWindow}
      />,
      <div key="graphs" className="graphs">
        {header.channels.map((channel, index) =>
          <Graph
            key={`${channel.label}-${index}`}
            channel={channel}
            frequency={frequency}
            data={data[index]}
            artifacts={artifacts[channel.label]}
            dateWindow={dateWindow}
            onChange={this.updateDateWindow}
          />
        )}
      </div>
    ];
  }

  render() {
    return (
      <div className="main" ref={el => this.container = el}>
        {this.props.edf
          ? this.renderGraphs()
          : <h1 className="loading">Loading EDF file</h1>
        }
      </div>
    );
  }

}
