class FileResource {

  constructor(file) {
    this.file = file;
    this.reader = new FileReader();
    this.typeMap = {
      text: 'readAsText',
      arraybuffer: 'readAsArrayBuffer',
    };
  }

  read(options) {
    const type = this.typeMap[options.type] || this.typeMap.text;
    const from = options.from || 0;
    const till = options.till || this.file.size;
    const blob = this.file.slice(from, till);

    const promise = new Promise((resolve) => {
      this.reader.onload = evt => resolve(evt.target.result);
    });

    this.reader[type](blob);

    return promise;
  }

}
