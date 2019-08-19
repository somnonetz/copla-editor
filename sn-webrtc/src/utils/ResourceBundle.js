import EDF from './EDF';
import Artifacts from './Artifacts';

export default class ResourceBundle {
  edf = null;
  artifacts = null;
  load = null;
  isLocal = null;
  uploadStatus = 0; // { 0: 'none', 1: 'destined', 2: 'uploading', 3: 'uploaded', 4: 'polling', 5: 'preparing' 6: 'done', 7: 'failed' }

  constructor({ edf, artifacts }) {
    this.setEDF(edf);
    this.setArtifact(artifacts);
    this.isLocal = this.edf && this.edf.file.isLocal;
    this.load = Promise.all([
      this.edf && this.edf.readHeader(),
      this.artifacts && this.artifacts.load(),
    ])
      .then(([header, artifactsData]) => {
        if (artifactsData) {
          this.artifacts.adjustTime(header.start);
        }
      })
      .then(() => this);
  }

  setEDF = file => {
    if (!file) return;
    this.edf = file instanceof EDF ? file : new EDF(file);
  };

  setArtifact = file => {
    if (!file) return;
    this.artifacts = file instanceof Artifacts ? file : new Artifacts(file);
  };
}
