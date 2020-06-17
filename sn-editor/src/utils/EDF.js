/*
== EDF Structure ==

STATIC HEADER RECORD
--------------------
8 ascii  : version of this data format (0)
80 ascii : local patient identification
80 ascii : local recording identification
8 ascii  : startdate of recording (dd.mm.yy)
8 ascii  : starttime of recording (hh.mm.ss)
8 ascii  : number of bytes in header record
44 ascii : reserved
8 ascii  : number of data records
8 ascii  : duration of a data record, in seconds
4 ascii  : number of signals (ns) in data record

DYNAMIC HEADER RECORD
---------------------
ns * 16 ascii : ns * label (e.g. EEG Fpz-Cz or Body temp)
ns * 80 ascii : ns * transducer type (e.g. AgAgCl electrode)
ns * 8 ascii  : ns * physical dimension (e.g. uV or degreeC)
ns * 8 ascii  : ns * physical minimum (e.g. -500 or 34)
ns * 8 ascii  : ns * physical maximum (e.g. 500 or 40)
ns * 8 ascii  : ns * digital minimum (e.g. -2048)
ns * 8 ascii  : ns * digital maximum (e.g. 2047)
ns * 80 ascii : ns * prefiltering (e.g. HP:0.1Hz LP:75Hz)
ns * 8 ascii  : ns * nr of samples in each data record
ns * 32 ascii : ns * reserved

DATA RECORD
-----------
nr of samples[1] * integer : first signal in the data record
nr of samples[2] * integer : second signal
..
nr of samples[ns] * integer : last signal
*/

import FileResource from './FileResource';
import WebResource from './WebResource';
import { channelNameMap, channelNumberMap } from './EdfChannelMaps.js';

const STATIC_HEADER_SIZE = 256;
const SAMPLE_SIZE = 2;

export default class EDF {
  header = {
    version: null,
    patientIdentification: null,
    recordIdentification: null,
    startDate: null,
    startTime: null,
    recordHeaderByteSize: null,
    reserved: null, // "EDF+C" if recording is uninterrupted, "EDF+D" if interrupted
    numberOfDataRecords: null,
    recordDurationTime: null, // duration of records in seconds
    numberOfSignals: null, // number of multible signals in a record / number of channels
    channels: [], // data specific for every channel
  };
  didReadHeader = false;

  constructor(file) {
    if (!file) throw new Error('No EDF file reference given');
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

  async readHeader() {
    if (!this.didReadHeader) {
      await this.readStaticHeader();
      await this.readDynamicHeader();
      this.didReadHeader = true;
    }
    return this.header;
  }

  async readStaticHeader() {
    const { header } = this;
    const options = {
      from: 0,
      till: STATIC_HEADER_SIZE,
    };

    const result = await this.file.read(options);

    header.version = +result.slice(0, 8);
    header.patientIdentification = result.slice(8, 88).trim();
    header.recordIdentification = result.slice(88, 168).trim();
    header.startDate = result.slice(168, 176).trim();
    header.startTime = result.slice(176, 184).trim();
    header.recordHeaderByteSize = +result.slice(184, 192);
    header.reserved = result.slice(192, 236).trim(); // "EDF+C" if recording is uninterrupted, "EDF+D" if interrupted
    header.numberOfDataRecords = +result.slice(236, 244);
    header.recordDurationTime = +result.slice(244, 252);
    header.numberOfSignals = +result.slice(252, 256);

    const d = header.startDate;
    const t = header.startTime;
    const year = +d.slice(6, 8);
    header.start = new Date(
      (year > 30 ? '19' : '20') + year,
      +d.slice(3, 5) - 1,
      d.slice(0, 2), // date
      t.slice(0, 2),
      t.slice(3, 5),
      t.slice(6, 8), // time
    );
    header.end = new Date(
      +header.start +
        header.numberOfDataRecords * header.recordDurationTime * 1000,
    );
  }

  async readDynamicHeader() {
    const { header } = this;
    const { numberOfSignals } = header;
    const channels = Array(numberOfSignals)
      .fill(1)
      .map((v, index) => ({ index }));
    const options = {
      from: STATIC_HEADER_SIZE,
      till: STATIC_HEADER_SIZE + numberOfSignals * 256,
    };
    const fields = [ /* eslint-disable no-multi-spaces, key-spacing */
      { name: 'label',             size: 16                     }, // label for each signal
      { name: 'transducerType',    size: 80                     },
      { name: 'physicalDimension', size:  8                     }, // uV or degreeC
      { name: 'physicalMinimum',   size:  8, filter: parseFloat },
      { name: 'physicalMaximum',   size:  8, filter: parseFloat },
      { name: 'digitalMinimum',    size:  8, filter: parseInt   },
      { name: 'digitalMaximum',    size:  8, filter: parseInt   },
      { name: 'preFiltering',      size: 80                     },
      { name: 'numberOfSamples',  size:  8,  filter: parseInt   }, // number of samples per signal in a record, samples are 2 byte integers. They are scaled later.
    ]; /* eslint-enable no-multi-spaces, key-spacing */

    const result = await this.file.read(options);
    let offset = 0;

    fields.forEach(({ name, size, filter = x => x }) => {
      for (let i = 0; i < numberOfSignals; i++) {
        const value = result.slice(offset, offset + size).trim();
        channels[i][name] = filter(value);
        offset += size;
      }
    });

    // associate standard labels and indexes
    channels.forEach(channel => {
      channel.standardLabel = channelNameMap[channel.label] || channel.label;
      channel.standardIndex = channelNumberMap[channel.standardLabel] || 0;
    });

    header.channels = channels;
    header.recordIndicies = [];
    // header.recordSampleIndicies = [0]; // maybe nice to have but not used
    header.recordSize = channels.reduce((sum, channel) => {
      header.recordIndicies.push(sum);
      // header.recordSampleIndicies.push(previous / SAMPLE_SIZE);
      return sum + channel.numberOfSamples;
    }, 0);
    header.recordSampleSize = header.recordSize / SAMPLE_SIZE;
  }

  async read(fromMs, tillMs) {
    const { header } = this;
    // Map timestamps to records
    const duration = header.recordDurationTime * 1000;
    const fromBlock = Math.floor(fromMs / duration);
    const tillBlock = Math.ceil(tillMs / duration);
    const numberOfBlocks = tillBlock - fromBlock;
    // TODO: Map records to indicies
    const headerSize = STATIC_HEADER_SIZE + header.numberOfSignals * 256; // header.recordHeaderByteSize
    const options = {
      type: 'arraybuffer',
      from: headerSize + header.recordSize * fromBlock * SAMPLE_SIZE,
      till: headerSize + header.recordSize * tillBlock * SAMPLE_SIZE, // -1 ?
    };

    const result = await this.file.read(options);

    // console.log('\t\tread', { fromMs, tillMs, fromBlock, tillBlock, fromByte: options.from, tillByte: options.till });
    // console.log('EDF.js - read - byteLength', result.byteLength);

    const data = [];
    const rawData = new Int16Array(result);
    let i;
    let j;
    let part;
    let offset;

    for (i = 0; i < header.numberOfSignals; i++) {
      const { numberOfSamples } = header.channels[i];
      data[i] = new Int16Array(numberOfBlocks * numberOfSamples);

      for (j = 0; j < numberOfBlocks; j++) {
        offset = header.recordIndicies[i] + j * header.recordSize;
        part = rawData.subarray(offset, offset + numberOfSamples);
        // console.log('numberOfBlocks', i, j, offset, part);
        data[i].set(part, numberOfSamples * j);
      }
    }

    return data;
  }

  // --------------------------------------------------
  // Data Access
  // --------------------------------------------------

  /**
   * Get Data for time interval
   * @param  {int}    from    relative Position in milliseconds
   * @param  {int}    till    relative Position in milliseconds
   * @param  {int}    frequency    number of values per seconds
   */
  async getData(options = {}) {
    if (!this.didReadHeader) await this.readHeader();

    console.log('getData', options);

    const { header } = this;
    const from = Math.max(options.from || 0, 0);
    const till = Math.min(
      options.till || 0,
      header.numberOfDataRecords * header.recordDurationTime * 1000,
    ); // bis ende

    if (till <= from) throw new Error('Bad interval');

    console.time('\t\tLoad data ');
    const data = await this.read(from, till);
    console.timeEnd('\t\tLoad data ');
    console.time('\t\tParse data');

    const buffer = [];

    for (let i = 0; i < data.length; i++) {
      const channel = header.channels[i];
      const { physicalMinimum, digitalMinimum } = channel;
      const physicalRange = channel.physicalMaximum - physicalMinimum + 1;
      const digitalRange = channel.digitalMaximum - digitalMinimum + 1;
      const yScale = physicalRange / digitalRange;
      const xScale =
        (1000 * header.recordDurationTime) / channel.numberOfSamples;
      const decimation = options.frequency
        ? (channel.numberOfSamples /
            header.recordDurationTime /
            options.frequency) |
            0 || 1
        : 1;
      const date = index => +header.start + from + index * xScale;
      const getValue = index =>
        (index - digitalMinimum) * yScale + physicalMinimum;

      // console.log('data', i, { length: data[i].length, decimation });

      buffer[i] = [];

      if (decimation === 1) {
        for (let j = 0; j < data[i].length; j++) {
          buffer[i].push([
            /* X */ date(j),
            /* Y */ getValue(data[i][j]),
            /*  */ [], // empty min / max as there is no min / max
          ]);
        }
      } else {
        let min;
        let max;
        let avg = 0; // TODO Median wäre besser als Average

        for (let j = 0; j < data[i].length; j++) {
          const value = getValue(data[i][j]);

          avg += value / decimation;
          if (min === undefined || value < min) min = value;
          if (max === undefined || value > max) max = value;

          if (j === 0) {
            // initially we don't have enough data to show a range
            buffer[i].push([date(j), value, []]);
          } else if (j % decimation === 0) {
            buffer[i].push([date(j), avg, [min, max]]);
            min = undefined;
            max = undefined;
            avg = 0;
          }
        }
      }
    } // end loop

    console.timeEnd('\t\tParse data');
    return buffer;
  }
}
