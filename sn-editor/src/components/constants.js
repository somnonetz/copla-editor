const edfHeaderKeys = [
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

const uploadStates = {
  READY: 0,
  DESTINED: 1,
  UPLOADING: 2,
  UPLOADED: 3,
  POLLING: 4,
  PREPARING: 5,
  DONE: 6,
  FAILED: 7,
};

export { edfHeaderKeys, uploadStates };