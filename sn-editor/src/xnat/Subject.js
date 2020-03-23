import * as utils from './utils';
import Base from './Base';
import Experiment from './Experiment';

export default class Subject extends Base {

   static urls = {
      all: '{host}/projects/{project}/subjects',
      one: '{host}/projects/{project}/subjects/{subject}',
      new: '{host}/projects/{project}/subjects/{subject}?{query}',
   }

   create = utils.create()
   getExperiments = utils.getChildren(Experiment)
   createExperiment = utils.createChild(Experiment)

   // data = { diagnose, host, ID, investigator, project }
   constructor(data) {
      super();
      this.initialize(data);
   }

   initialize(data) {
      this.data = utils.rename(data, {
         ID: 'subject',
         label: 'subject_label',
      });
      this.data.query = this.getQuery();
   }

   getQuery() {
      return this.data.type || '';
   }

}
