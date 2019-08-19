import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { formatSize } from '../utils/utils';

const edfHeader = [
  'numberOfSignals',
  'start',
  'end',
  'patientIdentification',
  'recordIdentification',
  'recordHeaderByteSize',
  'numberOfDataRecords',
  'recordDurationTime',
  'recordSize',
  'recordSampleSize',
];

const EdfInfoBox = ({ edf, pseudonyms, onClose }) => (
  <div className="infobox">
    <button className="toggleInfobox" onClick={onClose}>
      ×
    </button>
    {edf && (
      <section>
        <h2>EDF file header informationen</h2>
        <table>
          <thead>
            <tr>
              <th>EDF Header</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {edfHeader.map(key => (
              <tr key={key}>
                <td>{key}</td>
                <td>{`${edf.header[key]}`}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Label</th>
              <th>physical Dimension</th>
              <th>Number of Samples</th>
              <th>Digital min / max</th>
              <th>Physical min / max</th>
            </tr>
          </thead>
          <tbody>
            {edf.header.channels.map(channel => (
              <tr key={channel.index}>
                <td>{channel.index + 1}</td>
                <td>{channel.label}</td>
                <td>{channel.physicalDimension}</td>
                <td>{channel.numberOfSamples}</td>
                <td>
                  {channel.digitalMinimum} / {channel.digitalMaximum}
                </td>
                <td>
                  {channel.physicalMinimum} / {channel.physicalMaximum}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    )}

    <h2>Pseudonyms</h2>
    {_.map(pseudonyms, ({ patient, pseudonym, files }) => (
      <table key={pseudonym} className="pseudonyms fixed">
        <thead>
          <tr>
            <th>{patient}</th>
            <th>➡</th>
            <th>{pseudonym}</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.date}>
              <td>{file.date}</td>
              <td>{file.filename}</td>
              <td>{formatSize(file.size)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ))}
  </div>
);

EdfInfoBox.propTypes = {
  edf: PropTypes.object,
  pseudonyms: PropTypes.object,
  onClose: PropTypes.func,
};

EdfInfoBox.defaultProps = {
  edf: null,
  pseudonyms: null,
  onClose() {},
};

export default EdfInfoBox;
