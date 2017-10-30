import _ from 'lodash';

export default class {

  resource = null;
  data = null;
  loadCallback = _.noop;

  constructor(resource) {
    this.resource = resource;
    this.load();
  }

  onLoad(callback = _.noop) {
    if (this.data) callback(this.data);
    else this.loadCallback = callback;
  }

  load() {
    this.resource.read().then((text) => {
      this.data = parse(text);
      this.loadCallback(this.data);
    });
  }

  adjustTime(baseDate) {
    console.time('adjustArtifactsTime');
    const dateString = baseDate.toDateString();

    _.each(this.data, (list) => {
      let lastItemTime = null;
      list.forEach((artifact) => {
        const time = new Date(`${dateString} ${artifact.time}`);

        if (time < lastItemTime) {
          time.setDate(time.getDate() + 1);
        }

        artifact.time = lastItemTime = time; // eslint-disable-line no-multi-assign
      });
    });
    console.timeEnd('adjustArtifactsTime');
  }

  getData({ name, from, till } = {}) {
    console.log('ArtifactsReader.getData', name, from, till);
  }

}

// EEG C4-A1| 21:55:41|      1|    Unusual Increase
function parse(text) {
  const artifacts = {};
  const headerEnd = text.indexOf('\r\n\r\n');

  text
    .slice(headerEnd)
    .trim()
    .split('\n')
    .forEach((line) => {
      const array = line.split('|').map(s => s.trim());
      const [channel, time, epoch, name] = array;
      if (!artifacts[channel]) artifacts[channel] = [];
      artifacts[channel].push({ time, epoch, name });
    });

  return artifacts;
}
