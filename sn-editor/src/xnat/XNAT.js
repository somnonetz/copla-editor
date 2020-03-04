import _ from 'lodash';
import * as http from './http';
import * as utils from './utils';
import events from './Events';

import Project from './Project';
import Subject from './Subject';
import Experiment from './Experiment';
import Scan from './Scan';
import Resource from './Resource';


export default class XNAT {

   Project = Project
   Subject = Subject
   Experiment = Experiment
   Scan = Scan
   Resource = Resource

   urls = {
      session: '{host}/JSESSION', // https://wiki.xnat.org/pages/viewpage.action?pageId=6226264
      auth: '{host}/auth',
   }

   getProjects = utils.getChildren(Project)
   createProject = utils.createChild(Project)

   constructor(host, username, password) { // eslint-disable-line consistent-return
      this.on = events.on;
      this.data = {
        host: host || `${window.location.origin}/xnat/REST`
      };

      if (username && password) {
         return this.login(username, password);
      }
   }

   login(username, password) {
      if (!username || !password) {
         throw new Error('Missing one or more parameter.');
      }

      const url = utils.tpl(this.urls.session, this.data);
      const credentials = window.btoa(`${username}:${password}`);

      return http.get(url, {
         headers: {
            Authorization: `Basic ${credentials}`,
         },
      }).then(session => this); // eslint-disable-line no-unused-vars
   }

   logout() {
      const url = utils.tpl(this.urls.session, this.data);
      return http.del(url)
         .then(_.stubTrue, _.stubTrue); // always succeeds
   }

   checkLogin() {
    const url = utils.tpl(this.urls.auth, this.data);
    return http.get(url, { redirect: 'manual' })
      .then(response => response.ok)
      .catch(() => false);
   }

   checkIfHostIsReachable() {
      const url = utils.tpl(`{host}/../favicon.ico?_=${Date.now()}`, this.data);
      const timeout = new Promise((resolve, reject) => window.setTimeout(reject, 3000));

      return Promise.race([http.get(url), timeout])
         .then(() => true, () => false);
   }

  getSession() {
    const url = utils.tpl(this.urls.session, this.data);
    return http.get(url).then(response => response.text());
  }

   renewSession() {
      const url = utils.tpl('{host}/version', this.data);
      return http.get(url).then(
         () => true,
         () => false, // Fehlermeldung übergeben?
      );
   }

   whoami() {
    const url = utils.tpl(this.urls.auth, this.data);
    const pattern = /User '(\w+)' is logged in/; // hard coded in UserAuth.java
    return http.getText(url)
      .then(text => _.last(text.match(pattern)))
      .catch(() => null);
   }
}
