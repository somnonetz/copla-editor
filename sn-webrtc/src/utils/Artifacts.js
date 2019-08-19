import _ from 'lodash';
import FileResource from './FileResource';
import WebResource from './WebResource';

export default class Artifacts {
  file = null;
  data = null;
  types = {};
  size = undefined;

  constructor(file) {
    this.setResource(file);
  }

  setResource(file) {
    if (typeof file.read === 'function') {
      this.file = file;
    } else if (typeof file === 'string') {
      this.file = new WebResource(file);
    } else if (file instanceof File) {
      this.file = new FileResource(file);
    } else {
      throw new Error('File type not supported');
    }
  }

  async load() {
    if (!this.data) {
      const text = await this.file.read();
      const [artifacts, types] = parse(text);
      this.data = artifacts;
      this.types = types;
      this.size = _.reduce(this.data, (sum, array) => sum + array.length, 0);
    }
    return this.data;
  }

  adjustTime(baseDate) {
    console.time('adjustArtifactsTime');
    const dateString = baseDate.toDateString();

    _.each(this.data, list => {
      let lastItemTime = null;
      list.forEach(artifact => {
        const time = new Date(`${dateString} ${artifact.time}`);

        if (time < lastItemTime) {
          time.setDate(time.getDate() + 1);
        }

        artifact.time = lastItemTime = +time; // eslint-disable-line no-multi-assign
      });
    });
    console.timeEnd('adjustArtifactsTime');
  }
}

// EEG C4-A1| 21:55:41|    1|   Unusual Increase
function parse(text) {
  const artifacts = {};
  const types = {};
  const headerEnd = text.indexOf('\r\n\r\n');

  text
    .slice(headerEnd)
    .trim()
    .split('\n')
    .forEach(line => {
      if (!line.trim()) return;
      const array = line.split('|').map(s => s.trim());
      const [channel, time, epoch, name] = array;
      if (!artifacts[channel]) artifacts[channel] = [];
      artifacts[channel].push({ time, epoch, name });
      types[name] = (types[name] || 0) + 1;
    });

  return [artifacts, types];
}
