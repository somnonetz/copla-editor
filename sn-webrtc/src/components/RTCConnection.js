/* eslint-disable jsx-a11y/accessible-emoji */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SimpleWebRTC from 'simplewebrtc';
import Pointer from './Pointer';
import FileTransfer from '../utils/FileTransfer';

const url = process.env.REACT_APP_SIGNALLING_SERVER;
const legendWidth = 57; // width of the digraph legend of every graph. needed to adjust cursor position.

export default class RTCConnection extends Component {
  static propTypes = {
    isHost: PropTypes.bool,
    emitter: PropTypes.object,
    edf: PropTypes.object,
    room: PropTypes.string,
    pseudonyms: PropTypes.object,
  };

  static defaultProps = {
    isHost: false,
    emitter: { on() {}, off() {} },
    edf: null,
    room: 0, // TODO brauchen wir für slave
    pseudonyms: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      room: props.room,
      webrtc: null,
      peer: null,
      stream: null,
      me: null,
      pointer: null,
      isCalling: false,
      usePseudonym: true,
      graphWrapperDimensions: null,
    };
  }

  componentDidMount() {
    const { emitter } = this.props;
    emitter.on('message', ({ type, data }) => this.sendMessage(type, data));
    emitter.on('l-graphWrapperDimensions', graphWrapperDimensions =>
      this.setState({ graphWrapperDimensions }),
    );
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseleave', this.handleMouseLeave);

    if (this.state.room) {
      this.setUpWebRTC();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseleave', this.handleMouseLeave);
  }

  setUpWebRTC = () => {
    const { room } = this.state;
    console.log('setUpWebRTC', { room });
    const webrtc = new SimpleWebRTC({
      url,
      localVideoEl: 'localVideo', // the id/element dom element that will hold "our" video
      remoteVideosEl: 'remoteVideo', // the id/element dom element that will hold remote videos
      autoRequestMedia: false, // immediately ask for camera access
      media: {
        audio: true,
        video: true,
      },
      receiveMedia: {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      },
      enableDataChannels: true,
      debug: true,
    });

    window.webrtc = webrtc;

    webrtc.joinRoom(room);

    webrtc.on('videoAdded', (video, peer) => {
      if (!this.state.isCalling) this.toggleCall();
    });

    webrtc.on('videoRemoved', (video, peer) => {
      if (this.state.isCalling) this.toggleCall();
    });

    // webrtc.on('readyToCall', () => console.log('readyToCall'));

    webrtc.on('channelMessage', this.handleMessage);
    webrtc.on('connectionReady', me => this.setState({ me }));

    webrtc.on('createdPeer', peer => {
      console.warn('webrtc.on createdPeer', peer);
      this.setState({ peer });

      peer.pc.on('iceConnectionStateChange', event => {
        const { iceConnectionState } = peer.pc;
        console.warn('iceConnectionStateChange', iceConnectionState);

        // dunno why, but host stops at `connected` and receiver at `completed`
        // so we settle on `connected`
        if (iceConnectionState === 'connected') {
          this.props.emitter.emit('l-connectionEstablished', peer);
          console.warn('CONNECTED iceConnectionStateChange', {
            session: peer.sid,
            peerprefix: peer.browserPrefix,
            prefix: webrtc.capabilities.prefix,
            version: webrtc.capabilities.browserVersion,
          });
        }

        if (iceConnectionState === 'closed') {
          this.setState({ peer: null });
        }
      });

      webrtc.on('localStream', stream => {
        peer.pc.addStream(stream);
        this.setState({ stream });
      });

      peer.pc.on('negotiationNeeded', event => {
        peer.pc.offer();
      });
    });

    this.setState({ webrtc });

    // webrtc.on('createdPeer', peer => {});
    // webrtc.on('iceFailed', peer => {});
    // webrtc.on('connectivityError', peer => {});
  };

  getRoom = async () => {
    const response = await fetch(`${url}/room`);
    const { room } = await response.json();
    this.setState({ room }, this.setUpWebRTC);
  };

  sendMessage = async (type, data) => {
    const { peer } = this.state;

    if (!peer) return;

    console.warn('send message ', type, { data });
    try {
      await waitForChannelOpen('edf');
      peer.sendDirectly('edf', type, data);

      async function waitForChannelOpen(label) {
        return new Promise(resolve => {
          const channel = peer.getDataChannel(label);

          if (channel.readyState === 'open') resolve();
          else peer.on('channelOpen', check);

          function check(unknownChannel) {
            if (channel.label !== unknownChannel.label) return;
            this.off('channelOpen', check);
            resolve();
          }
        });
      }
    } catch (err) {
      console.error('App.sendMessage', err);
    }
  };

  handleMessage = async (peer, channelLabel, { type, payload }) => {
    const { isHost, edf, emitter } = this.props;
    console.warn('received message ', type, { peer, channelLabel, payload });

    // some messages are specific; the rest is generic and will be
    // passed through to local space with changed prefix (`l` to `s`)

    if (type === 'read') {
      if (!isHost || !edf) return;
      this.handleReadRequest({ edf, payload, peer, channelLabel });
    } else if (type === 'mouseMove') {
      if (!this.state.graphWrapperDimensions) return;
      const { top, width, height } = this.state.graphWrapperDimensions;
      const { relX, relY, isOut } = payload;
      if (isOut) {
        this.setState({ pointer: null });
      } else {
        const absX = relX * (width - legendWidth) + legendWidth;
        const absY = relY * height + top;
        this.setState({ pointer: { absX, absY } });
      }
    } else if (type.startsWith('l-')) {
      const newType = type.replace(/^l-/, 's-');
      emitter.emit(newType, payload);
    } else if (type.startsWith('s-')) {
      console.warn('WRONG MESSAGE TYPE', type, payload);
    } else {
      console.error('UNKNOWN MESSAGE', type, payload);
    }
  };

  handleMouseMove = ({ pageX, pageY }) => {
    if (!this.state.graphWrapperDimensions) return;
    const { top, width, height } = this.state.graphWrapperDimensions;
    const relX = (pageX - legendWidth) / (width - legendWidth);
    const relY = (pageY - top) / height;
    const isOut = relX < 0 || relX > 1 || relY < 0 || relY > 1;
    this.sendMessage('mouseMove', isOut ? { isOut } : { relX, relY });
  };

  handleMouseLeave = () => {
    this.sendMessage('mouseMove', { isOut: true });
  };

  handleReadRequest = async ({ edf, payload, peer, channelLabel }) => {
    const { pseudonyms } = this.props;
    const { usePseudonym } = this.state;
    const from = payload.from || 0; // `from` can be empty and will be set to start of file

    const buffer = await edf.file.read(payload);

    if (usePseudonym && from <= 88) {
      const array = new Uint8Array(buffer);
      const rawChars = array.subarray(Math.max(from, 8), 88);
      const patient = String.fromCharCode.apply(null, rawChars).trim();
      const { size, name: filename } = edf.file;
      const pseudonym = pseudonyms
        ? pseudonyms.add({ patient, filename, size })
        : 'anonymous';
      for (let i = 0; i < 80; i++) {
        array[i + 8] = (pseudonym[i] || ' ').charCodeAt();
      }
    }

    FileTransfer.send(peer, buffer, channelLabel);
  };

  toggleCall = () => {
    const { webrtc, peer, stream, isCalling } = this.state;
    if (!isCalling) {
      webrtc.startLocalVideo();
    } else {
      webrtc.stopLocalVideo();
      peer.pc.removeStream(stream);
    }
    this.setState({ isCalling: !isCalling });
  };

  download = () => {
    this.props.emitter.emit('l-download');
  };

  renderInitial() {
    const { isHost } = this.props;

    if (isHost) {
      return <button onClick={this.getRoom}>Share</button>;
    }

    return (
      <form className="connectForm" method="GET">
        <input
          name="room"
          type="number"
          minLength="4"
          maxLength="4"
          placeholder="PIN"
        />
        <button type="submit">Connect</button>
      </form>
    );
  }

  renderPeer() {
    const { me, peer } = this.state;
    const chop = name => (name ? name.substr(0, 4) : '❓');
    const other = peer ? chop(peer.id) : '❓';

    return (
      <span className="peer">
        {chop(me)} 🔄 {other}
      </span>
    );
  }

  render() {
    const { room, peer, pointer, isCalling, usePseudonym } = this.state;

    if (!room) return this.renderInitial();

    const { isHost } = this.props;
    const toggleUsePseudonym = event =>
      this.setState({ usePseudonym: event.target.checked });

    return (
      <span className="rtc-connection">
        <a className="room" href={`./?room=${room}`}>
          🔐 {room}
        </a>
        {peer && (
          <button className="call" onClick={this.toggleCall}>
            {isCalling ? '📵' : '☎'}️
          </button>
        )}
        {isHost && (
          <label>
            <input
              type="checkbox"
              checked={usePseudonym}
              onChange={toggleUsePseudonym}
            />{' '}
            pseudonymize
          </label>
        )}
        {isHost || (
          <button className="download" onClick={this.download}>
            📦️
          </button>
        )}
        {this.renderPeer()}
        <Pointer position={pointer} />
      </span>
    );
  }
}
