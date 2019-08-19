import FileTransfer from './FileTransfer';

export default class WebRTCResource {
  id = 0;
  channel = 'edf';

  constructor(peer, size, name) {
    this.peer = peer;
    this.size = size;
    this.name = name;
  }

  async read({ from, till, type }) {
    const size = till - from || this.size;
    const channelLabel = `${this.channel}-${++this.id}`;

    try {
      await this.waitForChannelOpen(channelLabel);
      const result = this.peer.sendDirectly(channelLabel, 'read', {
        from,
        till,
        type: 'arraybuffer',
      });
      if (!result) throw new Error(`Could not send message to ${channelLabel}`);
    } catch (err) {
      console.error('WebRTCResource.read', err);
    }

    const buffer = await FileTransfer.load(this.peer, size, channelLabel);

    if (type === 'arraybuffer') return buffer;

    return new TextDecoder().decode(buffer);
  }

  async waitForChannelOpen(label) {
    return new Promise(resolve => {
      const channel = this.peer.getDataChannel(label);

      if (channel.readyState === 'open') resolve();
      else this.peer.on('channelOpen', check);

      function check(unknownChannel) {
        if (channel.label !== unknownChannel.label) return;
        this.off('channelOpen', check);
        resolve();
      }
    });
  }
}
