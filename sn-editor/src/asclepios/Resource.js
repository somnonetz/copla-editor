
import { uploadData } from 'asclepios-sse-client';

export default class Resource {

   constructor(data) {
      this.initialize(data);
   }

   initialize(data) {
      this.data = data;
   }

   async create(onProgress) {
      onProgress(0);
      uploadData(this.data, this.data.path, '123', '123');
      onProgress(100);
   }
}
