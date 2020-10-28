
import { encryptUploadSearchableBlob, downloadDecryptBlob } from 'asclepios-sse-client';

export default class SSEResource {

   constructor(path) {
      this.path = path;
   }

   async read(kenc) {
      const name =  this.path.substring(this.path.lastIndexOf('/') + 1);
      const blob = await downloadDecryptBlob(this.path, kenc);
      return new File([blob], name);
   }

   async create(file, headers, type, sharedKey, kenc, onProgress) {
      onProgress(0);

      var reader = new FileReader();

      reader.onload = (event) => {
         var blobData = new Blob([new Uint8Array(event.target.result)], { type });
         encryptUploadSearchableBlob(blobData, this.path, { type, ...headers }, this.path, sharedKey, kenc);
         onProgress(100);
      };

      reader.readAsArrayBuffer(file);
   }
}
