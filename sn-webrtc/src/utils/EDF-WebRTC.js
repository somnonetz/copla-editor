export default class EDFWebRTC {
  id = 0;
  channel = 'edf';
  connections = {};
  header = null;

  constructor(webrtc) {
    this.webrtc = webrtc;

    webrtc.on('channelMessage', (peer, channel, data = {}) => {
      console.log('channelMessage', peer, channel, data);
      const { id, payload } = data.payload;

      if (channel !== this.channel) return;
      if (!id) return;
      if (!this.connections[id]) return;

      this.connections[id](payload); // resolve pending promises with data
      delete this.connections[id];
    });
  }

  async readHeader() {
    console.log('EDFWebRTC readHeader');
    if (this.header) return this.header;

    this.header = await this.send('readHeader');

    return this.header;
  }

  async getData(options = {}) {
    console.log('EDFWebRTC getData');
    return await this.send('getData', options);
  }

  send(type, data = {}) {
    const id = ++this.id;
    return new Promise(resolve => {
      console.log('EDFWebRTC send', id);
      this.connections[id] = resolve;
      this.webrtc.sendDirectlyToAll(this.channel, type, { id, ...data });
    });
  }
}
