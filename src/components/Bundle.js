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
      <div className="list-group m-t-1" key={edf.file.name}>
        <button className="bg-muted" onClick={onSelect}>{edf.file.name}</button>
        {artifacts &&
          [<div key="artifacts">
            {artifacts.size.toLocaleString()} Events in <code>{artifacts.file.name}</code>
          </div>,
          _.map(artifacts.types, (amount, name) =>
            <button key={name} onClick={console.log} className="btn btn-link spread">
              {name} <span className="tag tag-info">{amount}</span>
            </button>
          )]
        }
        {this.state.isLocal &&
          <button className="btn btn-primary" onClick={this.upload}>Upload</button>
        }
      </div>
    );
  }

}
