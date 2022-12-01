import * as utils from './utils';
// import * as http from './http';
import Base from './Base';

export default class Scan extends Base {

   static urls = {
      all: '{host}/projects/{project}/subjects/{subject}/experiments/{experiment}/scans/',
      one: '{host}/projects/{project}/subjects/{subject}/experiments/{experiment}/scans/{scan}',
      new: '{host}/projects/{project}/subjects/{subject}/experiments/{experiment}/scans/{scan}?{query}',
   }

   type = 'biosignals:edfScanData'

   create = utils.create()

   // data = { host, ID, project, subject, subject_name }
   constructor(data) {
      super();
      this.initialize(data);
   }

   initialize(data) {
      this.data = utils.rename(data, {
         ID: 'experiment',
      });
      this.data.query = this.getQuery();
   }

   getQuery() {
      const type = this.data.type || this.type;
      const date = utils.getFormattedDate();
      return `xsiType=${type}&date=${date}`;
   }

}
