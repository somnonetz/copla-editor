import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Charts, ChartContainer, ChartRow, YAxis, LineChart, Resizable } from 'react-timeseries-charts';
import { TimeSeries, TimeRange } from 'pondjs';
// import _ from 'lodash';
import EDF from 'utils/EDF';

export default class extends Component {

  static propTypes = {
    edfResource: PropTypes.object.isRequired,
    artifacts: PropTypes.object,
  }

  defaultProps = {
    edfResource: null,
    artifacts: null,
  }

  state = {
    edf: null,
    data: null,
  }

  chunkSize = (1024 * 512) - 1; // 5 MB (keine ahnung warum)
  currentPosition = 0;

  componentWillMount() {
    const edf = new EDF(this.props.edfResource);
    edf.once('readHeader', () => {
      console.log('readHeader');
      const [from, till] = this.getByteRange();
      // this.correctArtifactsTime(); // -> ist jetzt in artifacts.adjustTime(this.edf.header.start)
      edf.getData(from, till, this.setData);
    });
    this.setState({ edf });
  }

  // goLeft() {
  //   console.log('goLeft');
  //   const [from, till] = this.getByteRange(-this.chunkSize);
  //   this.edf.getData(from, till, this.setData);
  // }

  // goRight() {
  //   console.log('goRight');
  //   const [from, till] = this.getByteRange(this.chunkSize);
  //   this.edf.getData(from, till, this.setData);
  // }

  getByteRange = (offset = 0) => {
    console.log('getByteRange');
    if (this.currentPosition + offset >= 0) {
      this.currentPosition += offset;
    }

    const from = this.currentPosition;
    const till = from + this.chunkSize;
    return [from, till];
  }

  setData = (points) => {
    console.log('setData');

    // debugger;
    // TODO voll länge des edf … sinnvoll? sonst nur aktuellen ausschnitt anzeigen.
    // const timerange = new TimeRange([this.state.edf.start, this.state.edf.end]);
    // const timerange = new TimeRange([1369385936000, 1369388033995]);

    const data = {
      name: 'traffic',
      columns: ['time', 'value'],
      points: points[0],
      // points: [
      //   [1400425947000, 10],
      //   [1400435958000, 20],
      //   [1400445969000, 30],
      //   [1400455979000, 20],
      // ]
    };

    const timeseries = new TimeSeries(data);

    this.setState({ timeseries });
  }

  render() {
    if (!this.state.edf) {
      return <h1 className="loading">Loading EDF file</h1>;
    }

    if (!this.state.timeseries) {
      return <h1 className="loading">Rendering Data</h1>;
    }

    return (
      <Resizable>
        <ChartContainer timeRange={this.state.timeseries.timerange()} trackerTimeFormat="%b %d %Y %X" trackerShowTime showGrid>
          <ChartRow height="200">
            <YAxis id="axis1" label={this.state.edf.header.labels[0]} min={-300} max={300} type="linear" format=".2f" />
            <Charts>
              <LineChart axis="axis1" series={this.state.timeseries} />
            </Charts>
          </ChartRow>
        </ChartContainer>
      </Resizable>
    );
  }

}
