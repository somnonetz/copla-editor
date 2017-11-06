import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Login from 'components/Login';
import Upload from 'components/Upload';
import XNAT from 'xnat/XNAT';
import { host, autologin, credentials } from 'config';

export default class extends Component {

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
    this.setState({ xnat, loggedIn });
    this.props.onLoginChange(loggedIn);
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
      this.props.onLoginChange(true);
      return true;
    }
    catch (e) {
      this.props.onLoginChange(false);
      return e;
    }
  }

  handleLogout = () => {
    this.setState({
      loggedIn: false,
      username: null,
    });
  }

  render() {
    const { username, password, loginMessage, loggedIn } = this.state;
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
        {_.map(bundles, bundle =>
          <Upload key={bundle.edf.file.name} bundle={bundle} onFinish={onNewData} />
        )}
      </div>
    );
  }

}
