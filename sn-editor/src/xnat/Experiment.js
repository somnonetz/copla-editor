import * as utils from './utils';
import * as http from './http';
import Base from './Base';
import Scan from './Scan';

export default class Experiment extends Base {

   static urls = {
      all: '{host}/projects/{project}/subjects/{subject}/experiments/',
      one: '{host}/projects/{project}/subjects/{subject}/experiments/{experiment}',
      new: '{host}/projects/{project}/subjects/{subject}/experiments/{experiment}?{query}',
   }

   type = 'xnat:imageSessionData'

   create = utils.create()
   getScans = utils.getChildren(Scan)
   createScan = utils.createChild(Scan)

   // data = { host, ID, project, subject, subject_name }
   constructor(data) {
      super();
      this.initialize(data);
   }

   initialize(data) {
      this.data = utils.rename(data, {
         ID: 'experiment',
         label: 'experiment_label'
      });
      this.data.query = this.getQuery();
   }

   getQuery() {
      const type = this.data.type || this.type;
      const date = utils.getFormattedDate();
      return `xsiType=${type}&date=${date}`;
   }

   startPipeline(pipeline, pipelineParams) {
      const params = new URLSearchParams(pipelineParams).toString()
      const url = `{host}/projects/{project}/pipelines/${pipeline}/experiments/{experiment}?${params}`;
      const headers = { 'Content-Type': 'text/plain' };
      return http.post(utils.tpl(url, this.data), { headers });
   }

   getReconstructions() {
    const url = '{host}/projects/{project}/subjects/{subject}/experiments/{experiment}/reconstructions/';
    return http.getJSON(utils.tpl(url, this.data));
   }

}
