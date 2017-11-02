import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

export default class extends Component {

  static propTypes = {
    bundle: PropTypes.object.isRequired,
    onSelect: PropTypes.func,
  }

  static defaultProps = {
    onSelect: {},
  }

  state = {
    isLocal: false,
  }

  async componentWillMount() {
    await this.props.bundle.load;
    const isLocal = this.props.bundle.isLocal; // TODO resource checken nach `isLocal` und nur wenn ja upload button anzeigen
    this.setState({ isLoaded: true, isLocal });
  }

  upload = () => {
    console.log('upload');
  }

  render() {
    const { edf, artifacts } = this.props.bundle;
    const onSelect = () => this.props.onSelect(this.props.bundle);

    return (
      <div className="list-group m-t-1" key={edf.filename}>
        <button onClick={onSelect}>{edf.filename}</button>
        {artifacts &&
          <div>
            <p>{artifacts.filename}</p>
            <p>{artifacts.size} Events</p>
            {_.keys(artifacts.data).map(name =>
              [<span className="tag">{name}</span>, ' ']
            )}
          </div>
        }
        {this.state.isLocal &&
          <button className="btn btn-primary" onClick={this.upload}>Upload</button>
        }
      </div>
    );
  }

}
