import _ from 'lodash';
import * as utils from './utils';
import * as http from './http';
import Base from './Base';
import Subject from './Subject';
import Experiment from './Experiment';

export default class Project extends Base {

   static urls = {
      all: '{host}/projects/',
      one: '{host}/projects/{project}',
      new: '{host}/projects/{project}/?xnat:projectData/name={name}&xnat:projectData/secondary_ID={name}',
   }

   getSubjects = utils.getChildren(Subject)
   createSubject = utils.createChild(Subject)

   // data = { ID, URI, description, host, name, pi_firstname, pi_lastname, secondary_ID }
   constructor(data) {
      super();
      this.initialize(data);
   }

   initialize(data) {
      this.data = utils.rename(data, {
         ID: 'project',
         name: 'project_name',
      });
   }

   getExperiments() {
      const url = '{host}/projects/{project}/experiments/';
      return http.getJSON(utils.tpl(url, this.data))
         .then(experiments => experiments.map(
            experiment => new Experiment(_.assign({}, experiment, this.data))
         ));
   }

   getLabDataItem(field, element) {
      const url = `{host}/projects/{project}/subjects/coversheet/experiments/${field}?format=json`;
      return http.getJSON(utils.tpl(url, this.data))
         .then(result => _.get(result, 'items[0].children[0].items') || _.get(result, 'items[0]') || [])
         .catch(() => (element ? [] : {})) // item might not yet exist, so we treat it as empty
         .then((result) => {
            const data = {
               items: _.isArray(result) ? result.map(parse) : parse(result),
               type: `sncs:${field}Data`,
               subject: 'coversheet',
               experiment: field,
               element,
            };
            return new Experiment(_.assign(data, this.data));
         });

      function parse(obj) {
         return _.mapValues(obj.data_fields, (value) => {
            if (value === 'true') { return true; }
            if (value === 'false') { return false; }
            return utils.decodeHtmlEntities(value);
         });
      }
   }

   getLabData() {
      return Promise.all([
         this.getLabDataItem('core'),
         this.getLabDataItem('staff', 'person'),
         this.getLabDataItem('premises'),
         this.getLabDataItem('equipment', 'device'),
         this.getLabDataItem('cases'),
      ]).then(([core, staff, premises, equipment, cases]) => ({ core, staff, premises, equipment, cases }));
   }

   archiveLabData() {
      const year = new Date().getFullYear();

      return this.getLabData()
         .then(lab => Promise.all(_.map(lab, (experiment) => {
            experiment.data.type = experiment.data.type.replace(/^sncs/, 'sncsarc');
            experiment.data.experiment += `-archive-${year}`;
            delete experiment.data.items.label;
            delete experiment.data.items.id;
            delete experiment.data.items.ID;
            return experiment.save(experiment.data.items);
         })));
   }

   // data = { GROUP_ID, email, lastname, login, firstname, displayname }
   getUsers() {
      const url = '{host}/projects/{project}/users/?format=json';
      return http.getJSON(utils.tpl(url, this.data));
   }

}
