import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { slugify } from 'utils/utils'
import Experiment from 'xnat/Experiment';
import Project from 'xnat/Project';
import Subject from 'xnat/Subject';
import { host } from 'config';

const STATES = {
  READY: 0,
  DESTINED: 1,
  UPLOADING: 2,
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
    projectName: null,
    subjectName: null,
    experimentName: null,
  }

  componentDidMount() {
    let { project, subject, experiment } = this.props;
    let projectName, subjectName, experimentName, scanName;

    projectName = project.data.project_name;
    if (!subject) {
      subjectName = this.props.bundle.edf.header.patientIdentification.split(' ')[0];
    } else {
      subjectName = subject.data.subject_label;
    }
    if (!experiment) {
      experimentName = this.props.bundle.edf.header.recordIdentification.split(' ')[2];
    } else {
      experimentName = experiment.data.experiment_label;
    }
    scanName = slugify(this.props.bundle.edf.file.name.replace('.edf', ''), '_')

    this.setState({ projectName, subjectName, experimentName, scanName });
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

  getOrCreateExperiment = () => {
    if (!this.props.experiment) {
      return new Experiment({
        host,
        project: this.state.projectName,
        subject: this.state.subjectName,
        experiment: this.state.experimentName,
        type: 'biosignals:psgSessionData',
      }).create();
    }
    return this.props.experiment;
  }

  startUpload = async () => {
    let error = null;

    try {
      this.updateStatus(STATES.UPLOADING);

      let experiment = await this.getOrCreateExperiment();
      let scan = await experiment.createScan({
        scan: this.state.scanName,
        type: 'biosignals:edfScanData'
      });
      let resource = await scan.createResource({ resource: 'EDF' });

      await resource.createFile(this.props.bundle.edf.file.file, this.state.scanName + '.edf', progress => this.setState({ progress }));
      if (this.props.bundle.artifacts) {
        await resource.createFile(this.props.bundle.artifacts.file.file, this.state.scanName, progress => this.setState({ progress }));
      }

      this.updateStatus(STATES.DONE);
    }
    catch (e) {
      console.error(e);
      error = e.status;
      this.finish(error);
    }
  }

  render() {
    const { uploadStatus, error } = this.state;
    const { projectName, subjectName, experimentName, scanName } = this.state;
    const dest = `${projectName}/${subjectName}/${experimentName}`
    const progress = `${this.state.progress.toFixed(2)}%`;
    const Alert = ({ type = 'info', children }) => <div className={`alert alert-${type}`}>{children}</div>;
    
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

      case STATES.DONE:
        return (
          <div className="list-group m-b-1">
            <Alert type="info"><strong>Uploaded</strong> {scanName}.</Alert>
            <p>Uploaded <code>{scanName}</code> to <code>{dest}</code>.</p>
            <button onClick={() => this.finish(false)}>Done</button>
          </div>
        );

      case STATES.FAILED:
        return (
          <div className="list-group m-b-1">
            <Alert type="error"><strong>Error</strong> {error}.</Alert>
            <p>Failed to upload <code>{scanName}</code> to <code>{dest}</code>.</p>
            <button onClick={this.startUpload}>Retry Upload</button>
          </div>
        );

      default: // STATES.DESTINED and no state (which should not happen)
        return (
          <div className="list-group m-b-1">
            <Alert type="info"><strong>Upload</strong></Alert>
            <p>Upload <code>{scanName}</code> to <code>{dest}</code>.</p>
            <button onClick={this.startUpload}>Start Upload</button>
          </div>
        );

    }
  }

}
