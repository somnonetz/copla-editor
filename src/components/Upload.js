import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Countdown from 'components/Countdown';
import Experiment from 'xnat/Experiment';
import { sleep } from 'utils/utils';
import { host, defaultProject, defaultSubject } from 'config';

const STATES = {
  DESTINED: 1,
  UPLOADING: 2,
  UPLOADED: 3,
  POLLING: 4,
  PREPARING: 5,
  DONE: 6,
  FAILED: 7,
};

export default class Upload extends Component {

  static propTypes = {
    bundle: PropTypes.object.isRequired,
    onFinish: PropTypes.func,
  }

  static defaultProps = {
    onFinish: {},
  }

  state = {
    error: null,
    progress: 0,
    uploadStatus: STATES.DESTINED,
  }

  updateStatus = (uploadStatus) => {
    this.props.bundle.uploadStatus = uploadStatus;
    this.setState({ uploadStatus });
  }

  finish = (error) => {
    this.setState({
      error,
      progress: 0,
      uploadStatus: error ? STATES.FAILED : STATES.DONE,
    });
  }

  getExperiment = () => {
    // const name = this.props.bundle.edf.header.recordIdentification.replace(/\s/g, '_');
    const options = {
      host,
      subject: defaultSubject,
      project: defaultProject,
      experiment: Math.random().toString(32).slice(2), // name,
      type: 'snet01:sleepResearchSessionData',
    };
    return new Experiment(options);
  }

  startUpload = async () => {
    try {
      this.updateStatus(STATES.UPLOADING);

      // create new session (experiment), scan and resource
      const experiment = await this.getExperiment().create();
      const scan = await experiment.createScan({ scan: 'psg', type: 'snet01:psgScanData' });
      const resource = await scan.createResource({ resource: 'PSG' });

      // upload edf file
      const file = this.props.bundle.edf.file.file;
      await resource.createFile(file, progress => this.setState({ progress }));
      this.updateStatus(STATES.UPLOADED);

      // start pipeline
      await experiment.startPipeline('somnonetz-pipeline', 'sn_getEDFHeaderdata');
      this.updateStatus(STATES.POLLING);

      // wait for results
      const newBundle = await this.getResults(experiment);
      this.updateStatus(STATES.PREPARING);

      await this.props.onFinish(newBundle);
    }
    catch (e) {
      this.finish(e.message);
    }

    return this.finish();
  }

  getResults = async (experiment) => {
    let reconstructions = [];

    while (reconstructions.length < 2 && this.state.uploadStatus < STATES.DONE) {
      await sleep(5);
      reconstructions = await experiment.getReconstructions();
    }

    // create new bundle with results
    const find = postfix => _.find(reconstructions, { ID: `psg_${postfix}` }) || {};
    const clear = (url = '') => url.replace(/^\/data/, '');
    const artifactsURL = find('artifact_log').URI;
    const edfURL = find('edf').URI;

    if (!edfURL) throw new Error('No results found');
    if (!artifactsURL) throw new Error('No artifacts found');

    return {
      edf: `${host}${clear(edfURL)}/out/files/psg_edfData.edf`,
      artifacts: `${host}${clear(artifactsURL)}/out/files/edfData_artifactLog.txt`,
    };
  }

  render() {
    const { uploadStatus, error } = this.state;
    const filename = this.props.bundle.edf.file.name;
    const progress = `${this.state.progress.toFixed(2)}%`;
    const Alert = ({ type = 'info', children }) => <div className={`alert alert-${type}`}>{children}</div>;

    switch (uploadStatus) {

      case STATES.UPLOADING:
        return (
          <Alert>
            <span>Uploading</span>
            <div className="progress-bar progress-info">
              <div style={{ width: progress }}>{progress}</div>
            </div>
          </Alert>
        );

      case STATES.UPLOADED:
        return <Alert><span className="loading">Starting Analysis</span></Alert>;

      case STATES.POLLING:
        return <Alert>Waiting <Countdown seconds={600} onTargetReached={() => this.finish('Pipeline failed')} /> for Results.</Alert>;

      case STATES.PREPARING:
        return <Alert><span className="loading">Preparing Results</span></Alert>;

      case STATES.DONE:
        return <Alert type="success">Uploaded {filename}.</Alert>;

      case STATES.FAILED:
        return <Alert type="error"><strong>Error</strong> {error}.</Alert>;

      default: // STATES.DESTINED and no state (which should not happen)
        return (
          <div className="list-group m-b-1">
            <p>Will upload <code>{filename}</code> into <code>{defaultProject}/{defaultSubject}</code>.</p>
            <button onClick={this.startUpload}>Start Upload</button>
          </div>
        );

    }
  }

}
