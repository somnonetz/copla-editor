
import { encryptProgressUploadSearchableBlob, downloadProgressDecryptBlob , uploadData} from 'asclepios-sse-client';

export default class SSEResource {

   constructor(path) {
      this.path = path;
   }

   async read(kenc, keyid) {
      const name =  this.path.substring(this.path.lastIndexOf('/') + 1);
      // const blob = 
      await downloadProgressDecryptBlob(this.path, kenc, keyid);
      // return new File([blob], name);
   }

   create(file, headers, type, sharedKey, kenc, keyid, onProgress) {
      onProgress(0);

      var reader = new FileReader();

      reader.onload = async (event) => {
         var blobData = new Blob([new Uint8Array(event.target.result)], { type });
         await encryptProgressUploadSearchableBlob(blobData, this.path, { type, ...headers }, this.path, sharedKey, kenc, keyid);
         onProgress(100);
      };

      reader.readAsArrayBuffer(file);
   }
}
