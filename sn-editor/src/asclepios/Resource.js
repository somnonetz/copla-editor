
import { uploadData, encryptUploadSearchableBlob } from 'asclepios-sse-client';

export default class Resource {

   async create(file, headers, path, type, sharedKey, kenc, onProgress) {
      onProgress(0);

      var reader = new FileReader();

      reader.onload = (event) => {
         var blobData = new Blob([new Uint8Array(event.target.result)], { type });
         encryptUploadSearchableBlob(blobData, path, { type, ...headers }, path, sharedKey, kenc);
         onProgress(100);
      };

      reader.readAsArrayBuffer(file);
   }
}
