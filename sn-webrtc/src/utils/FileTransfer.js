function send(peer, buffer, channelLabel) {
  const chunksize = 16384;
  const channel = peer.getDataChannel(channelLabel);
  let start = 0;

  return new Promise(resolve => {
    channel.bufferedAmountLowThreshold = 8 * chunksize;
    channel.addEventListener('bufferedamountlow', sendSlice);
    window.setTimeout(sendSlice, 0);

    function sendSlice() {
      const slice = buffer.slice(start, start + chunksize);
      channel.send(slice);
      start += chunksize;

      if (start >= buffer.byteLength) resolve();
      else if (channel.bufferedAmount <= channel.bufferedAmountLowThreshold) {
        window.setTimeout(sendSlice, 0);
      }
    }
  });
}

function load(peer, size, channelLabel) {
  const channel = peer.getDataChannel(channelLabel);
  const receiveBuffer = new Int8Array(size);
  let received = 0;

  return new Promise((resolve, reject) => {
    channel.binaryType = 'arraybuffer';
    channel.onerror = err => reject(err);
    channel.onmessage = message => {
      const buffer = message.data;
      receiveBuffer.set(new Int8Array(buffer), received);
      received += buffer.byteLength;

      if (received === size) {
        resolve(receiveBuffer.buffer);
      } else if (received > size) {
        reject(new Error('received more than expected, discarding...'));
      }
    };
  });
}

export default { send, load };
