
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

   create(file, headers, type, sharedKey, kenc, keyid, bearerToken, onProgress) {
      onProgress(0);

      var reader = new FileReader();

      reader.onload = async (event) => {
         // await fetch('http://xnat.localhost:8084/api/v1/put', {
         //    method: 'POST',
         //    headers: {
         //       'Content-Type': 'application/json',
         //       'Authorization': 'Bearer ' + bearerToken
         //    },
         //    body: JSON.stringify({
         //       "encKey": "ujfojfijaopja9387982y98u98jsojnoa08fjua0u",
         //       "verKey": "jijiuufu84789208fnusu0ufn0j0j00js0iuuppsu"
         //    }),
         // });
         var blobData = new Blob([new Uint8Array(event.target.result)], { type });
         await encryptProgressUploadSearchableBlob(blobData, this.path, { type, ...headers }, this.path, sharedKey, kenc, keyid, onProgress);
      };

      reader.readAsArrayBuffer(file);
   }
}
