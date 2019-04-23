import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';


export default class Login extends Component {

  static propTypes = {
    onLogin: PropTypes.func.isRequired,
    username: PropTypes.string,
    password: PropTypes.string,
    autologin: PropTypes.bool,
    passwordOnly: PropTypes.bool,
    message: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  }

  static defaultProps = {
    username: '',
    password: '',
    message: '',
    autologin: false,
    passwordOnly: false,
  }

  state = {
    message: this.props.message,
  }

  componentWillMount() {
    const { autologin, username, password } = this.props;
    if (autologin && username && password) {
      this.login({ username, password });
    }
  }

  login = async (ev) => {
    this.setState({ isLoading: true });
    const form = new FormData(ev.target);
    const username = form.get('username');
    const password = form.get('password');
    const response = await this.props.onLogin(username, password);
    if (response !== true) {
      this.setState({
        isLoading: false,
        message: {
          header: 'Fehler beim Login',
          text: response.statusText || 'unbekannt',
          type: 'error',
        },
      })
    }
  }

  getErrorMessage = () => {
    const message = this.getMessage();
    if (message) {
      if (message.type === 'error') {
        const header = <strong>{message.header || 'Fehler'}</strong>;
        return <p className="alert alert-error">{header}: {message.text}</p>;
      }

      const header = message.header ? <strong>{message.header}</strong> : '';
      const className = `alert alert-${message.type || 'info'}`;
      return <p className={className}>{header}: {message.text}</p>;
    }
    return '';
  }

  getMessage = () => {
    const message = this.state.message;

    if (!message) { return false; }

    if (_.isString(message)) {
      return {
        text: message,
        type: 'info',
      };
    }
    return message;
  }

  render() {
    if (this.state.isLoading) {
      return <p className="alert"><span className="loading">Loading</span></p>;
    }

    return (
      <div className="card">
        <div className="card-header">XNAT Login</div>
        <div className="card-body">
          {this.getErrorMessage()}
          <form className="form form-vertical" onSubmit={this.login}>

            <label className="form-group">
              <input type="text" className="form-control" name="username" placeholder="Username" required defaultValue={this.props.username} />
              <span className="form-label">Username</span>
            </label>

            <label className="form-group">
              <input type="password" className="form-control" name="password" placeholder="Password" required defaultValue={this.props.password} />
              <span className="form-label">Password</span>
            </label>

            <label className="form-group">
              <button type="submit" className="btn btn-primary full-width">Login</button>
            </label>
          </form>
        </div>
      </div>
    );
  }

}
