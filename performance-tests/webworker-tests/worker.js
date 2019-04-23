/* global importScripts, EDF, FileResource */
/* eslint-disable no-restricted-globals */
importScripts('FileResource.js');

self.edf = null;

const api = {
  async init({ file }) {
    const resource = new FileResource(file);
    self.edf = new EDF(resource);
    await self.edf.readHeader();
  },
  async getData(options) {
    return self.edf.getData(options);
  },
  async import({ scriptUrl }) {
    importScripts(scriptUrl);
  },
};

self.onmessage = async ({ data }) => {
  const { fnName, options } = data;
  const result = await api[fnName](options);
  self.postMessage(result);
};
