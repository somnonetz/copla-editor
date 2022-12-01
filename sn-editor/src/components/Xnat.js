import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Login from 'components/Login';
import Upload from 'components/Upload';
import XNAT from 'xnat/XNAT';
import { host, autologin, credentials } from 'config';

const UPLOADSTATES = {
  DONE: 6,
};

export default class XnatView extends Component {

  static propTypes = {
    onLoginChange: PropTypes.func,
    onUpdateStatus: PropTypes.func,
    onNewData: PropTypes.func,
    bundles: PropTypes.array,
  }

  static defaultProps = {
    onLoginChange: {},
    onNewData: {},
    onUpdateStatus: {},
    bundles: [],
  }

  constructor(props) {
    const { username, password } = credentials || {};
    super(props);
    this.state = {
      username,
      password,
      loggedIn: null,
      loginMessage: '',
      xnat: {},
      projects: [],
      selectedProject: null,
      subjects: [],
      selectedSubject: null,
      experiments: [],
      selectedExperiment: null,
    };
    // this.setStateAsync = state => new Promise(resolve => this.setState(state, resolve));
  }

  async componentDidMount() {
    const xnat = new XNAT(host);

    xnat.on('sessionEnded', () => this.setState({
      loggedIn: false,
      loginMessage: 'Session ended',
    }));

    const loggedIn = await xnat.checkLogin();

    if (loggedIn) {
      this.initSelected(xnat);
    }

    this.setState({ xnat, loggedIn });
    this.props.onLoginChange(loggedIn);
  }

  handleUpdateStatus = async (bundle, uploadStatus) => {
    if (uploadStatus === UPLOADSTATES.DONE) {
      this.initSelected(this.state.xnat)
    }
    this.props.onUpdateStatus(bundle, uploadStatus);
  }

  handleLogin = async (username, password) => {
    try {
      await this.state.xnat.login(username, password);

      this.setState({
        username,
        password,
        loggedIn: true,
        loginMessage: '',
      });
  
      await this.initSelected(this.state.xnat);
      this.props.onLoginChange(true);
    
      return true;
    }
    catch (e) {
      this.props.onLoginChange(false);
      return e;
    }
  }

  initSelected = async (xnat) => {
    const projects = await xnat.getProjects();
    this.setState({ projects });

    const urlParams = new URLSearchParams(window.location.search);
    const initialProject = urlParams.get('project');
    const initialSubject = urlParams.get('subject');
    const initialExperiment = urlParams.get('experiment');

    if (initialProject) {
      await this.handleSelectProject(
        { target: { value: initialProject } },
        initialSubject,
        initialExperiment,
      );
    } else if (projects[0]) {
      await this.handleSelectProject({ target: { value: projects[0].data.project } });
    }
  }

  handleSelectProject = async (event, initialSubject, initialExperiment) => {
    const project = this.state.projects.find(p => p.data.project === event.target.value);

    let subjects;
    if (project) {
      subjects = await project.getSubjects();
    } else {
      subjects = []
    }

    this.setState({
      selectedProject: project,
      subjects: subjects,
    });

    await this.handleSelectSubject(
      { target: { value: initialSubject } },
      initialExperiment,
    );
  }

  handleSelectSubject = async (event, initialExperiment) => {
    const subject = this.state.subjects.find(s => s.data.subject === event.target.value);

    let experiments;
    if (subject) {
      experiments = await subject.getExperiments();
    } else {
      experiments = []
    }

    this.setState({
      selectedSubject: subject,
      experiments: experiments
    });

    await this.handleSelectExperiment({ target: { value: initialExperiment } });
  }

  handleSelectExperiment = async (event) => {
    const experiment = this.state.experiments.find(s => s.data.experiment === event.target.value);

    this.setState({
      selectedExperiment: experiment,
    });
  }

  handleLogout = () => {
    this.setState({
      loggedIn: false,
      username: null,
    });
  }

  render() {
    const {
      username,
      password,
      loginMessage,
      loggedIn,
      projects,
      subjects,
      experiments,
      selectedProject,
      selectedSubject,
      selectedExperiment,
    } = this.state;

    const { bundles, onNewData } = this.props;

    if (!loggedIn) {
      return (
        <Login
          onLogin={this.handleLogin}
          autologin={autologin}
          username={username}
          password={password}
          message={loginMessage}
        />
      );
    }

    return (
      <div className="xnat">

        <p className="alert alert-success"><strong>XNAT</strong> Logged in{username && <span> as {username}</span>}</p> 

        {_.map(bundles, bundle =>
          <Upload
            key={bundle.edf.file.name}
            bundle={bundle}
            onFinish={onNewData}
            project={selectedProject}
            subject={selectedSubject}
            experiment={selectedExperiment}
            onUpdateStatus={this.handleUpdateStatus}
          />
        )}

        <div className="card">
          <div className="card-body">
            <div class="select-box">
              <label>Project</label>
              <select name="project" onChange={this.handleSelectProject}>
                {_.map(projects, p =>
                  <option key={p.data.project} value={p.data.project} selected={p.data.project === _.get(selectedProject, 'data.project')}>{p.data.project_name}</option>
                )};
              </select>
            </div>
            <div class="select-box">
              <label>Subject</label>
              <select name="subject" onChange={this.handleSelectSubject}>
                <option key="new" value={null}>Auto</option>
                {_.map(subjects, s =>
                  <option key={s.data.subject} value={s.data.subject} selected={s.data.subject === _.get(selectedSubject, 'data.subject')}>{s.data.subject_label}</option>
                )};
              </select>
            </div>
            <div class="select-box">
              <label>Session</label>
              <select name="experiment" onChange={this.handleSelectExperiment}>
                <option key="new" value={null}>Auto</option>
                {_.map(experiments, e =>
                  <option key={e.data.experiment} value={e.data.experiment} selected={e.data.experiment === _.get(selectedExperiment, 'data.experiment')}>{e.data.experiment_label}</option>
                )};
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

}
