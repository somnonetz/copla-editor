import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import queryString from 'query-string';
import Graphs from 'components/Graphs';
import Controls from 'components/Controls';
import WebResource from 'utils/WebResource';
import FileResource from 'utils/FileResource';
import Artifacts from 'utils/Artifacts';

export default class extends Component {

  state = {
    edfResource: null,
    artifacts: null,
  }

  componentWillMount() {
    const params = queryString.parse(window.location.search);
    const fileURL = params.edf;
    const artifactsURL = params.artifacts;

    if (artifactsURL) {
      this.setArtifacts(new WebResource(artifactsURL));
    }

    if (fileURL) {
      this.setState({ edfResource: new WebResource(fileURL) });
    }
  }

  onEdfDrop = (files = []) => {
    this.setState({ edfResource: new FileResource(files[0]) });
  }

  onArtifactsDrop = (files = []) => {
    this.setArtifacts(new FileResource(files[0]));
  }

  setArtifacts = (resource) => {
    const artifacts = new Artifacts(resource);
    artifacts.onLoad(() => this.setState({ artifacts }));
  }

  renderDropzone(wrapperClass = '', childClass = '') {
    return (
      <div className={wrapperClass}>
        <div className={childClass}>
          <Dropzone
            onDrop={this.onEdfDrop}
            multiple={false}
            disablePreview
            activeClassName="active"
            rejectClassName="rejected"
            className="dropzone truncate"
          >
            Drop EDF File
          </Dropzone>
        </div>
        <div className={childClass}>
          <Dropzone
            onDrop={this.onArtifactsDrop}
            multiple={false}
            disablePreview
            activeClassName="active"
            rejectClassName="rejected"
            className="dropzone truncate"
          >
            Drop Artifacts  File
          </Dropzone>
        </div>
      </div>
    );
  }

  render() {
    const hasFile = !!this.state.edfResource;
    const containerClass = `container ${hasFile ? 'full-width' : ''}`;
    const proxy = { onClick() {} };

    return (
      <div className={containerClass}>
        <header className="site-header dashed-bottom">
          <a href="/" className="site-title">EDF Viewer</a>
          <Controls proxy={proxy} />
          {hasFile && this.renderDropzone('site-nav')}
        </header>

        <main className="site-main">
          {this.state.error &&
            <pre className="alert alert-error">{this.state.error.message}</pre>
          }

          {hasFile
            ? <Graphs edfResource={this.state.edfResource} artifacts={this.state.artifacts} controls={proxy} />
            : this.renderDropzone('grid-inline', 'cell')
          }
        </main>

        <footer className="site-footer dashed-top">
          Gitlab: <a href="https://git.tools.f4.htw-berlin.de/somnonetz/edf-viewer">somnonetz/edf-viewer</a>
        </footer>
      </div>
    );
  }

}
