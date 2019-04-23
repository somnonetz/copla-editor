import React, { Component } from 'react';
import _ from 'lodash';
import Emitter from 'wildemitter';
import queryString from 'query-string';
import Dropzone from 'react-dropzone';
import Controls from './components/Controls';
import EDFView from './components/EDF-View';
import RTCConnection from './components/RTCConnection';
import EdfInfoBox from './components/EdfInfoBox';
import EDF from './utils/EDF';
import WebRTCResource from './utils/WebRTCResource';
import Pseudonyms from './utils/Pseudonyms';

export default class App extends Component {

  dateWindow = null

  constructor(props) {
    super(props);
    const params = queryString.parse(window.location.search);
    const isHost = !!params.edf;
    const emitter = {};
    Emitter.mixin(emitter);
    this.state = {
      params,
      isHost,
      emitter,
      edf: null,
      peer: null,
      isInfoboxVisible: false,
    };
    this.pseudonyms = new Pseudonyms();
  }

  componentDidMount() {
    const { isHost, params, emitter } = this.state;

    if (isHost && params.edf) {
      this.setUpEDF(params.edf);
    }

    emitter.on('l-connectionEstablished', (peer) => {
      const { isHost, edf } = this.state;
      console.log('l-connectionEstablished', isHost, edf);

      if (isHost && edf) {
        const { name, size } = edf.file;
        const plotbands = []; // TODO set real plotbands
        this.emitMessage('l-edfMetaData', { name, size, dateWindow: this.dateWindow, plotbands });
      }

      this.setState({ peer });
    });

    // `edfMetaData` may come in before our connection to the peer is stable (so we can send as well)
    emitter.on('s-edfMetaData', ({ size, name, dateWindow /*, plotbands*/ }) => {
      console.log('s-edfMetaData', name);
      this.dateWindow = dateWindow;

      const onReady = (peer) => {
        const resource = new WebRTCResource(peer, size, name);
        this.setUpEDF(resource);
      };

      if (this.state.peer) onReady(this.state.peer);
      else emitter.once('l-connectionEstablished', onReady);
    });

    emitter.on('l-edfStateChange', this.onEdfStateChange);
    emitter.on('l-band', this.emitMessage.bind(this, 'l-band'));
    this.emitMessage = _.debounce(this.emitMessage, 50); // mitigate loops and buffer fast movement
  }

  setUpEDF = async (resource) => {
    const edf = new EDF(resource);
    await edf.readHeader();
    this.setState({ edf });
  }

  toggleInfobox = () => {
    const { isInfoboxVisible } = this.state;
    this.setState({ isInfoboxVisible: !isInfoboxVisible });
  }

  emitMessage = (type, data) => {
    this.state.emitter.emit('message', { type, data });
  }

  onEdfStateChange = ({ prevState, currState }) => {
    if (`${prevState.dateWindow}` !== `${currState.dateWindow}`) {
      this.emitMessage('l-dateWindow', currState.dateWindow);
      this.dateWindow = currState.dateWindow;
    }
    // if (prevState.frequency !== currState.frequency) {
    //   this.emitMessage('l-frequency', currState.frequency);
    // }
  }

  renderContent() {
    const { edf, emitter } = this.state;

    if (edf) {
      return <EDFView key={edf.file.name} edf={edf} dateWindow={this.dateWindow} emitter={emitter} />;
    }

    const onDrop = (files = []) => {
      this.setUpEDF(files[0]);
      this.setState({ isHost: true });
    };

    return (
      <div className="defaultContent">
        <form className="connectForm" method="GET">
          <input name="room" type="number" minLength="4" maxLength="4" placeholder="PIN" />
          <button type="submit">Connect</button>
        </form>
        <hr />
        <Dropzone
          onDrop={onDrop}
          disablePreview
          activeClassName="active"
          rejectClassName="rejected"
          className="dropzone truncate"
        >
          Drop EDF File here
        </Dropzone>
      </div>
    );
  }

  render() {
    const { edf, isHost, emitter, params, isInfoboxVisible } = this.state;
    const room = params.room || '';

    return (
      <div className="wrapper">
        <header>
          <span className="title">SN-Vis</span>
          {edf &&
            <nav>
              <Controls emitter={emitter} />
              <button className="toggleInfobox" onClick={this.toggleInfobox}>ℹ️️</button>
            </nav>
          }
          <RTCConnection isHost={isHost} edf={edf} emitter={emitter} room={room} pseudonyms={this.pseudonyms} />
        </header>
        <main className="edf-wrapper">
          {this.renderContent()}
        </main>
        {isInfoboxVisible &&
          <EdfInfoBox edf={edf} pseudonyms={this.pseudonyms.getAll()} onClose={this.toggleInfobox} />
        }
      </div>
    );
  }
}
