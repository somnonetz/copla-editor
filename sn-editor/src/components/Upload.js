import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Countdown from 'components/Countdown';
import Experiment from 'xnat/Experiment';
import Project from 'xnat/Project';
import Subject from 'xnat/Subject';
import { sleep } from 'utils/utils';
import { host, doReconstruction, pipelineName, pipelineParams } from 'config';

const STATES = {
  READY: 0,
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
    onUpdateStatus: PropTypes.func,
    project: PropTypes.instanceOf(Project),
    subject: PropTypes.instanceOf(Subject),
    experiment: PropTypes.instanceOf(Experiment),
  }

  static defaultProps = {
    onFinish: {},
    onUpdateStatus: {},
  }

  state = {
    error: null,
    progress: 0,
    uploadStatus: STATES.DESTINED,
  }

  updateStatus = (uploadStatus) => {
    this.props.bundle.uploadStatus = uploadStatus;
    this.props.onUpdateStatus(this.props.bundle, uploadStatus);
    this.setState({ uploadStatus });
  }

  finish = (error) => {
    this.setState({
      error,
      progress: 0,
    });

    this.updateStatus(error ? STATES.FAILED : STATES.READY)

  }

  getExperiment = () => {
    // const name = this.props.bundle.edf.header.recordIdentification.replace(/\s/g, '_');

    const { project, subject } = this.props;

    const options = {
      host,
      subject: subject.data.subject,
      project: project.data.project,
      experiment: this.props.experimentName,
      type: 'snet01:sleepResearchSessionData',
    };

    return new Experiment(options);
  }

  startUpload = async () => {
    let error = null;

    try {
      this.updateStatus(STATES.UPLOADING);

      let experiment = this.props.experiment;

      if (!experiment) {
        experiment = await this.getExperiment().create();
      }

      const scan = await experiment.createScan({
        scan: this.props.bundle.edf.file.name.replace(/\s|\./g, '_').replace(/_edf$/g, ''),
        type: 'snet01:psgScanData'
      });

      const resource = await scan.createResource({ resource: 'EDF' });

      // upload edf file
      const file = this.props.bundle.edf.file.file;
      await resource.createFile(file, progress => this.setState({ progress }));

      this.updateStatus(STATES.DONE);

      if (doReconstruction) {
        // start pipeline
        await experiment.startPipeline(pipelineName, pipelineParams);
        this.updateStatus(STATES.POLLING);

        // wait for results
        const newBundle = await this.getResults(experiment);
        this.updateStatus(STATES.PREPARING);

        await this.props.onFinish(newBundle);
      }
    }
    catch (e) {
      console.error(e);
      error = e.statusText;
      this.finish(error);
    }
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
    const { project, subject, experiment } = this.props;
    const filename = this.props.bundle.edf.file.name;
    const progress = `${this.state.progress.toFixed(2)}%`;
    const Alert = ({ type = 'info', children }) => <div className={`alert alert-${type}`}>{children}</div>;

    const project_label = project.data.project_name;
    const subject_label = subject.data.subject_label;
    const experiment_label = _.get(experiment, 'data.experiment_label', null);

    switch (uploadStatus) {

      case STATES.UPLOADING:
        return (
          <div className="list-group m-b-1">
            <Alert>
              <span>Uploading</span>
              <div className="progress-bar progress-info">
                <div style={{ width: progress }}>{progress}</div>
              </div>
            </Alert>
          </div>
        );

      case STATES.UPLOADED:
        return <Alert><span className="loading">Starting Analysis</span></Alert>;

      case STATES.POLLING:
        return <Alert>Waiting <Countdown seconds={600} onTargetReached={() => this.finish('Pipeline failed')} /> for Results.</Alert>;

      case STATES.PREPARING:
        return <Alert><span className="loading">Preparing Results</span></Alert>;

      case STATES.DONE:
        return (
          <div className="list-group m-b-1">
            <Alert type="info"><strong>Uploaded</strong> {filename}.</Alert>
            <button onClick={() => this.finish(false)}>Done</button>
          </div>
        );

      case STATES.FAILED:
        return (
          <div className="list-group m-b-1">
            <Alert type="error"><strong>Error</strong> {error}.</Alert>
            <p>Upload <code>{filename}</code> to <code>{project_label}/{subject_label}/{experiment_label ? experiment_label : '<new experiment>' }</code>.</p>
            <button onClick={this.startUpload}>Retry Upload</button>
          </div>
        );

      default: // STATES.DESTINED and no state (which should not happen)
        return (
          <div className="list-group m-b-1">
            <Alert type="info"><strong>Upload</strong></Alert>
            <p>Upload <code>{filename}</code> to <code>{project_label}/{subject_label}/{experiment_label ? experiment_label : '<new experiment>' }</code>.</p>
            <button onClick={this.startUpload}>Start Upload</button>
          </div>
        );

    }
  }

}
