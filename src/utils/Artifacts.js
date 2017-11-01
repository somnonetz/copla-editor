import FileResource from './FileResource';
import WebResource from './WebResource';
import _ from 'lodash';

export default class {

  file = null;
  data = null;
  size = undefined;

  constructor(file) {
    this.setResource(file);
  }

  setResource(file) {
    if (typeof file.read === 'function') {
      this.filename = file.filename;
      this.file = file;
    }
    else if (typeof file === 'string') {
      this.filename = file;
      this.file = new WebResource(file);
    }
    else if (file instanceof File) {
      this.filename = file.name;
      this.file = new FileResource(file);
    }
    else {
      throw new Error('File type not supported');
    }
  }

  async load() {
    if (!this.data) {
      const text = await this.file.read();
      this.data = parse(text);
      this.size = _.reduce(this.data, (sum, array) => sum + array.length, 0);
    }
    return this.data;
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

        artifact.time = lastItemTime = +time; // eslint-disable-line no-multi-assign
      });
    });
    console.timeEnd('adjustArtifactsTime');
  }

}

// EEG C4-A1| 21:55:41|    1|   Unusual Increase
function parse(text) {
  const artifacts = {};
  const headerEnd = text.indexOf('\r\n\r\n');

  text
   .slice(headerEnd)
   .trim()
   .split('\n')
   .forEach((line) => {
    if (!line.trim()) return;
    const array = line.split('|').map(s => s.trim());
    const [channel, time, epoch, name] = array;
    if (!artifacts[channel]) artifacts[channel] = [];
    artifacts[channel].push({ time, epoch, name });
   });

  return artifacts;
}
