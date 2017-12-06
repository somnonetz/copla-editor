import _ from 'lodash';
// TODO check https://github.com/hammerlab/pileup.js/blob/master/src/main/RemoteFile.js

export default class {

  constructor(url) {
    this.url = url;
    this.name = url.split('/').pop().split('#')[0].split('?')[0]; // https://stackoverflow.com/a/17143667
    this.isLocal = false;
  }

  read(options = {}) {
    return new Promise((resolve, reject) => {
      const type = options.type || 'text';
      const from = options.from || 0;
      let till = options.till || '';
      const xhr = new XMLHttpRequest();

      xhr.open('GET', this.url, true);
      xhr.withCredentials = true;
      xhr.responseType = type;
      xhr.onabort = reject;
      xhr.onerror = reject;
      xhr.onload = () => {
        if (~~(xhr.status / 100) === 2) { // everything with 2xx is fine
          resolve(xhr.response);
        }
        else {
          reject(xhr.response);
        }
      };

      if (_.isNumber(till) && !(till % 2)) {
        till--; // we need an equal number of bytes in the response
      }
      if (from >= 0 && till > 0) {
        console.log('set request header', { from, till } );
        xhr.setRequestHeader('Range', `bytes=${from}-${till}`); // http://stackoverflow.com/questions/3303029/http-range-header
      }

      xhr.send();
    });
  }

}
