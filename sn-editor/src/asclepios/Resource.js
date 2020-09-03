
import { uploadData } from 'asclepios-sse-client';

export default class Resource {

   constructor(data) {
      this.initialize(data);
   }

   initialize(data) {
      this.data = data;
   }

   async create(sharedKey, kenc, onProgress) {
      onProgress(0);
      uploadData(this.data, this.data.path, sharedKey, kenc);
      onProgress(100);
   }
}
