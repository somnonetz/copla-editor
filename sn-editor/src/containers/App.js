import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import queryString from 'query-string';
import EDF from 'components/EDF-View';
import Controls from 'components/Controls';
import Sidebar from 'components/Sidebar';
import XNAT from 'components/Xnat';
import FileBrowser from 'components/FileBrowser';
import Bundle from 'utils/ResourceBundle';

export default class App extends Component {

  state = {
    bundles: [],
    activeBundle: null,
    showSidebar: true,
    loggedIn: false,
  }

  proxy = { onClick() {} }

  async componentDidMount() {
    const params = queryString.parse(window.location.search);
    const edf = params.edf;
    const artifacts = params.artifacts;
    if (edf) {
      const bundle = await new Bundle({ edf, artifacts }).load;
      this.setState({ bundles: [bundle], activeBundle: bundle });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.showSidebar !== prevState.showSidebar) { // was sidebar shown or hidden, trigger graph resize
      window.dispatchEvent(new Event('resize'));
    }
  }

  onEdfDrop = async (files = []) => {
    const newBundles = await Promise.all(files
      .filter(file => file.name.endsWith('.edf'))
      .map((edf) => {
        const artifactsName = edf.name.replace(/\.edf$/, '.txt');
        const artifacts = files.find(file => file.name === artifactsName);
        return new Bundle({ edf, artifacts }).load;
      }));

    const bundles = [...this.state.bundles, ...newBundles];

    if (bundles.length === 1 && !this.state.activeBundle) {
      this.setState({ bundles, activeBundle: bundles[0] });
    }
    else {
      this.setState({ bundles });
    }
  }

  renderDropzone(wrapperClass = '') {
    return (
      <div className={wrapperClass}>
        <Dropzone
          onDrop={this.onEdfDrop}
          multiple
          disablePreview
          activeClassName="active"
          rejectClassName="rejected"
          className="dropzone truncate"
        >
          Drop EDF and Artifacts Files
        </Dropzone>
      </div>
    );
  }

  handleLoginChange = (loggedIn) => {
    this.setState({ loggedIn });
  }

  handleSelect = (activeBundle) => {
    this.setState({ activeBundle });
  }

  handleUpload = (bundle) => {
    bundle.uploadStatus = 1; // destined
    this.setState({ bundles: this.state.bundles });
    // pseudonymisierung: ja / nein?
  }

  handleNewData = async (files) => {
    const bundle = await new Bundle(files).load;
    const bundles = [...this.state.bundles, bundle];
    return this.setState({ bundles });
  }

  handleSidebarToggle = (showSidebar) => {
    this.setState({ showSidebar });
  }

  renderEditor() {
    const { edf, artifacts } = this.state.activeBundle || {};
    const sidebarWidth = this.state.showSidebar ? '20rem' : '0rem';
    const uploadBundles = this.state.bundles.filter(b => b.uploadStatus);
    return (
      <div style={{ display: 'flex', maxWidth: '100%' }}>
        <Sidebar
          onToggle={this.handleSidebarToggle}
          showSidebar={this.state.showSidebar}
          width={sidebarWidth}
        >
          <XNAT
            onLoginChange={this.handleLoginChange}
            onNewData={this.handleNewData}
            bundles={uploadBundles}
          />
          <FileBrowser
            bundles={this.state.bundles}
            canUpload={this.state.loggedIn}
            onSelect={this.handleSelect}
            onUpload={this.handleUpload}
          />
        </Sidebar>
        <div className="edf-wrapper" style={{ maxWidth: `calc(100% - ${sidebarWidth})` }}>
          {edf
            ? <EDF key={edf.file.name} edf={edf} artifacts={artifacts} controls={this.proxy} />
            : <p className="alert alert-info">Select an EDF file to display it.</p>
          }
        </div>
      </div>
    );
  }

  render() {
    const hasBundle = this.state.bundles.length > 0;
    const hasActiveBundle = !!this.state.activeBundle;
    const containerClass = `container ${hasBundle ? 'full-width' : ''}`;

    return (
      <div className={containerClass}>
        <header className="site-header dashed-bottom">
          <a href="." className="site-title">copla-editor</a>
          {hasActiveBundle && <Controls proxy={this.proxy} />}
          {hasBundle && this.renderDropzone('site-nav')}
        </header>

        <main className="site-main">
          {this.state.error &&
            <pre className="alert alert-error">{this.state.error.message}</pre>
          }

          {hasBundle
            ? this.renderEditor()
            : this.renderDropzone()
          }
        </main>

        <footer className="site-footer dashed-top">
          Gitlab: <a href="https://git.tools.f4.htw-berlin.de/somnonetz/copla-editor">somnonetz/copla-editor</a>
        </footer>
      </div>
    );
  }

}
