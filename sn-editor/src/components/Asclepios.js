import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { uploadData } from 'asclepios-sse-client';
import { edfHeaderKeys, uploadStates as STATES } from './constants'


export default class AsclepiosView extends Component {

  static propTypes = {
    bundles: PropTypes.array,
  }

  static defaultProps = {
    bundles: [],
  }

  constructor(props) {
    super(props);

    this.state = {
      keyG: '',
      kenc: '',
    };
  };

  getEdfHeaders = (bundle) => {
    const headers = _.pick(bundle.edf.header, edfHeaderKeys);
    bundle.edf.header.channels.forEach(channel => {
      headers[`channel_${channel.index}_label`] = channel.label;
      headers[`channel_${channel.index}_physicalDimension`] = channel.physicalDimension;
      headers[`channel_${channel.index}_numberOfSamples`] = channel.numberOfSamples;
      headers[`channel_${channel.index}_digitalMinimum`] = channel.digitalMinimum;
      headers[`channel_${channel.index}_digitalMaximum`] = channel.digitalMaximum;
      headers[`channel_${channel.index}_physicalMinimum`] = channel.physicalMinimum;
      headers[`channel_${channel.index}_physicalMaximum`] = channel.physicalMaximum;
    })
    return headers;
  }

  handleInputKeyG = async (event) => {
    this.setState({
      keyG: event.target.value,
    });
  }

  handleInputKenc = async (event) => {
    this.setState({
      kenc: event.target.value,
    });
  }

  startUpload = async (bundle) => {
    const data = {type: 'snet01:psgScanData', 'url': bundle.xnatUrl, ...this.getEdfHeaders(bundle)};
    return uploadData(data, bundle.xnatUrl, this.state.keyG, this.state.kenc);
  }

  render() {
    const { bundles } = this.props;

    const Alert = ({ type = 'info', children }) => <div className={`alert alert-${type}`}>{children}</div>;

    const Upload = ({ bundle }) => {
      switch (bundle.uploadStatus) {
        case STATES.DONE:
          return (
            <div className="list-group m-b-1">
              <Alert type="info"><strong>Upload</strong></Alert>
              <button onClick={() => this.startUpload(bundle)}>Start Upload</button>
            </div>
          );
        default:
          return (
            <div className="list-group m-b-1">
              <Alert type="warning"><strong>Upload</strong></Alert>
              <p>Please upload to XNAT first</p>
            </div>
          );
      }
    };

    return (
      <div className="asclepios card card-success">
        <div className="card-header"><strong>ASCLEPIOS</strong></div> 
        <div className="card-body">
          {_.map(bundles, bundle =>
            <Upload
              bundle={bundle}
            />
          )}
          <div class="select-box">
            <label>KeyG</label>
            <input id="key-g" name="keyG" onChange={this.handleInputKeyG} value={this.state.keyG}></input>
          </div>
          <div class="select-box">
            <label>Kenc</label>
            <input id="kenc" name="kenc" onChange={this.handleInputKenc} value={this.state.kenc}></input>
          </div>
        </div>
      </div>
    );
  }

}
