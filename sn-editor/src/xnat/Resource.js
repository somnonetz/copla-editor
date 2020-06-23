import * as utils from './utils';
import * as http from './http';

export default class Resource {

   static urls = {
      all: '{parentURL}/resources/',
      one: '{parentURL}/resources/{resource}',
      new: '{parentURL}/resources/{resource}?{query}',
   }

   format = 'PSG'

   create = utils.create()

   // data = { host, parentURL, project, resource }
   constructor(data) {
      this.initialize(data);
   }

   initialize(data) {
      this.data = utils.rename(data, {
         ID: 'resource',
      });
      this.data.query = this.getQuery();
   }

   getQuery() {
      // const format = this.format;
      // return `format=${format}`;
      return '';
   }

   getFiles() {
    const url = '{parentURL}/resources/{resource}/files/';
    return http.getJSON(utils.tpl(url, this.data));
   }

   getFileUrl(file) {
      const url = `{parentURL}/resources/{resource}/files/${file.name}`;
      return utils.tpl(url, this.data);
   }

   createFile(file, onProgress) {
      return new Promise((resolve, reject) => {
        const url = `{parentURL}/resources/{resource}/files/${file.name}`;
        const formdata = new FormData();
        const xhr = new XMLHttpRequest(); // fetch doesn't emit progress, so we use XHR

        xhr.open('PUT', utils.tpl(url, this.data), true);
        xhr.withCredentials = true;
        xhr.onload = () => resolve(xhr.response);
        xhr.onabort = reject;
        xhr.onerror = reject;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            const value = (e.loaded / e.total) * 100;
            onProgress(value);
          }
        };

        formdata.append('file', file, file.name);
        xhr.send(formdata);
      });
   }


}
