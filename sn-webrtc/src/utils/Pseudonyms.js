export default class Pseudonyms {
  pseudonyms = {};

  constructor() {
    this.pseudonyms = JSON.parse(localStorage.getItem('pseudonyms')) || {};
  }

  add({ patient = 'none', filename = 'none', size = 0 }) {
    const pseudonym = this.pseudonyms[patient]
      ? this.pseudonyms[patient].pseudonym
      : btoa(Math.random()).substr(3, 16);

    if (!this.pseudonyms[patient]) {
      this.pseudonyms[patient] = { patient, pseudonym, files: [] };
    }

    const date = new Date().toLocaleString();
    this.pseudonyms[patient].files.push({ date, filename, size });
    localStorage.setItem('pseudonyms', JSON.stringify(this.pseudonyms));

    return pseudonym;
  }

  getAll() {
    return this.pseudonyms;
  }
}
