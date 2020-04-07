import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Login from 'components/Login';
import Upload from 'components/Upload';
import XNAT from 'xnat/XNAT';
import { host, autologin, credentials } from 'config';

export default class XnatView extends Component {

  static propTypes = {
    onLoginChange: PropTypes.func,
    onNewData: PropTypes.func,
    bundles: PropTypes.array,
  }

  static defaultProps = {
    onLoginChange: {},
    onNewData: {},
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
      xnat: null,
      projects: [],
      selectedProject: null,
      subjects: [],
      selectedSubject: null,
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
    let projects, subjects, selectedProject, selectedSubject;

    if (loggedIn) {
      projects = await xnat.getProjects();
      subjects = await projects[0].getSubjects();

      // use first returned project and subject as defaults
      selectedProject = projects[0];
      selectedSubject = subjects[0];
    }

    this.setState({ xnat, loggedIn, projects, subjects, selectedProject, selectedSubject});
    this.props.onLoginChange(loggedIn);
  }

  handleLogin = async (username, password) => {
    try {
      await this.state.xnat.login(username, password);
      const projects = await this.state.xnat.getProjects();
      const subjects = await projects[0].getSubjects();

      // use first returned project and subject as defaults
      const selectedProject = projects[0];
      const selectedSubject = subjects[0];

      this.setState({
        username,
        password,
        loggedIn: true,
        loginMessage: '',
        projects,
        subjects,
        selectedProject,
        selectedSubject
      });
      this.props.onLoginChange(true);
      return true;
    }
    catch (e) {
      this.props.onLoginChange(false);
      return e;
    }
  }

  handleSelectProject = async (event) => {
    const project = this.state.projects.find(p => p.data.project === event.target.value);
    const subjects = await project.getSubjects();

    this.setState({
      selectedProject: project,
      subjects: subjects,
    });
  }

  handleSelectSubject = async (event) => {
    const subject = this.state.subjects.find(s => s.data.subject === event.target.value);

    this.setState({
      selectedSubject: subject,
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
      selectedProject,
      selectedSubject,
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
        <p className="alert alert-success"><strong>XNAT</strong> Logged in as {username}.</p>
        <div class="select-box">
          <label>Project</label>
          <select name="project" onChange={this.handleSelectProject}>
            {_.map(projects, p =>
              <option key={p.data.project} value={p.data.project}>{p.data.project_name}</option>
            )};
          </select>
        </div>
        <div class="select-box">
          <label>Subject</label>
          <select name="subject" onChange={this.handleSelectSubject}>
            {_.map(subjects, s =>
              <option key={s.data.subject} value={s.data.subject}>{s.data.subject_label}</option>
            )};
          </select>
        </div>
        {_.map(bundles, bundle =>
          <Upload
            key={bundle.edf.file.name}
            bundle={bundle}
            onFinish={onNewData}
            project={selectedProject}
            subject={selectedSubject}
          />
        )}
      </div>
    );
  }

}
