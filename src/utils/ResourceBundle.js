import EDF from './EDF';
import Artifacts from './Artifacts';

export default class {

  edf = null
  artifacts = null
  load = null

  constructor({ edf, artifacts }) {
    this.setEDF(edf);
    this.setArtifact(artifacts);
    this.load = Promise.all([
      this.edf ? this.edf.readHeader() : null,
      this.artifacts ? this.artifacts.load() : null,
    ])
      .then(([header, artifactsData]) => {
        if (artifactsData) {
          this.artifacts.adjustTime(header.start);
        }
      })
      .then(() => this);
  }

  setEDF = (file) => {
    if (!file) return;
    this.edf = file instanceof EDF ? file : new EDF(file);
  }

  setArtifact = (file) => {
    if (!file) return;
    this.artifacts = file instanceof Artifacts ? file : new Artifacts(file);
  }


}
