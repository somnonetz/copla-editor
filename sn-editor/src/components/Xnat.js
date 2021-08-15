import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Login from 'components/Login';
import Upload from 'components/Upload';
import XNAT from 'xnat/XNAT';
import { host, autologin, credentials } from 'config';
import { uploadStates as UPLOADSTATES } from '../constants'

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
      selectedProject: {},
      subjects: [],
      selectedSubject: {},
      experiments: [],
      selectedExperiment: null,
      experimentName: null,
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
      this.setState({
        experiments: await this.state.selectedSubject.getExperiments(),
      })
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
    const subjects = await project.getSubjects();

    this.setState({
      selectedProject: project,
      subjects: subjects,
    });

    if (initialSubject) {
      await this.handleSelectSubject(
        { target: { value: initialSubject } },
        initialExperiment,
      );
    } else if (subjects[0]) {
      await this.handleSelectSubject({ target: { value: subjects[0].data.subject } });
    }
  }

  handleSelectSubject = async (event, initialExperiment) => {
    const subject = this.state.subjects.find(s => s.data.subject === event.target.value);
    const experiments = await subject.getExperiments();

    this.setState({
      selectedSubject: subject,
      experiments: experiments
    });

    if (initialExperiment) {
      await this.handleSelectExperiment({ target: { value: initialExperiment } });
    } else if (experiments[0]) {
      await this.handleSelectExperiment({ target: { value: null } })
    }
  }

  handleSelectExperiment = async (event) => {
    if (!event.target.value) {
      return this.setState({
        selectedExperiment: null,
      });
    }

    const experiment = this.state.experiments.find(s => s.data.experiment === event.target.value);

    this.setState({
      selectedExperiment: experiment,
    });
  }

  handleInputExperimentName = async (event) => {
    this.setState({
      experimentName: event.target.value,
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
      experimentName,
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
      <div className="xnat card card-success">
        <div class="card-header"><strong>XNAT</strong> Logged in{username && <span> as {username}</span>}</div> 
        <div className="card-body">
          {_.map(bundles, bundle =>
            <Upload
              key={bundle.edf.file.name}
              bundle={bundle}
              onFinish={onNewData}
              project={selectedProject}
              subject={selectedSubject}
              experiment={selectedExperiment}
              experimentName={experimentName}
              onUpdateStatus={this.handleUpdateStatus}
            />
          )}
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
              {_.map(subjects, s =>
                <option key={s.data.subject} value={s.data.subject} selected={s.data.subject === _.get(selectedSubject, 'data.subject')}>{s.data.subject_label}</option>
              )};
            </select>
          </div>
          <div class="select-box">
            <label>Sleep Research Session</label>
            <select name="experiment" onChange={this.handleSelectExperiment}>
              <option key="new" value={null}>Create New Session</option>
              {_.map(experiments, e =>
                <option key={e.data.experiment} value={e.data.experiment} selected={e.data.experiment === _.get(selectedExperiment, 'data.experiment')}>{e.data.experiment_label}</option>
              )};
            </select>
          </div>
          <div class="select-box">
            <label>New Session Name</label>
            <input id="experiment-name" name="experimentName" onChange={this.handleInputExperimentName}></input>
          </div>
        </div>
      </div>
    );
  }

}
