/*
   HTTP Helper especially for XNAT

   From https://github.com/github/fetch
 */

import _ from 'lodash';
import * as http from './http';


// Parameter --------------------------------------------------

// From http://www.2ality.com/2016/05/six-nifty-es6-tricks.html
export function mandatory() {
   throw new Error('Missing parameter');
}


// Template Helper --------------------------------------------

const pattern = /(?:\{)(.+?)(?:\})/gi;

export function tpl(template, data = {}) {
   return template.replace(pattern, (match, submatch) => encodeURI(data[submatch] || ''));
}

export function compileTemplates(templates, data) {
   _.each(templates, (value, key) => {
      Object.defineProperty(templates, key, {
         // TODO throw error when property is mandatory and not present (`{*mandatory}` vs. `{optional}`)
         get: () => value.replace(pattern, (match, submatch) => data[submatch] || ''),
         enumerable: true,
      });
   });
}


// Items ------------------------------------------------------

export function getChildren(ChildClass, urlName = 'all') {
   return function curry() {
      return http.getJSON(tpl(ChildClass.urls[urlName], this.data))
         .then(items => items.map(
            item => new ChildClass(Object.assign({}, item, this.data))
         ));
   };
}

export function createChild(ChildClass) {
   return function curry(additionalData = {}) {
      return new ChildClass(Object.assign({}, this.data, additionalData)).create();
   };
}

export function create(urlName = 'new') {
   return function curry(additionalData = {}) {
      Object.assign({}, this.data, additionalData);
      const URL = tpl(this.constructor.urls[urlName], this.data);
      return http.putText(URL)
         .then((name) => {
            if (name) {
               const propertyName = this.constructor.name.toLowerCase();
               this.data[this.data[propertyName] ? `${propertyName}_name` : propertyName] = name;
            }
            return this;
         });
   };
}


// Collection Handling ----------------------------------------

/**
 * Returns and object with renamed keys
 * @param  {Object} object  Original object
 * @param  {Object} map     Map with the renamings
 * @return {Object}         new objects
 *
 * `rename({a:1, b:2}, {b:'c'}) -> {a:1, c:2}`
 */
export function rename(object = {}, map = {}) {
   return _.mapKeys(object, (value, key) => map[key] || key);
   // with renaming
   // return _.mapKeys(object, (value, key) => (object[map[key]] ? `${map[key]}_${key}` : map[key]) || key);
}


// Time -------------------------------------------------------

// Format dd/mm/yy, e.g. 01/01/14
export function getFormattedDate() {
   const date = new Date();
   const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
   const month = (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1);
   const year = date.getYear() - 100;
   return `${day}/${month}/${year}`;
}


// Text -------------------------------------------------------

const elem = window.document.createElement('textarea');
export function decodeHtmlEntities(html) {
   elem.innerHTML = html;
   return elem.value;
}


// Enums -------------------------------------------------------
// From https://gist.github.com/oriSomething/16a16d8ea12573307dc6

export function enumNumber(...params) {
   return Object.freeze(_.mapValues(_.invert(params), Number));
}

export function enumString(...params) {
   return Object.freeze(_.mapKeys(params));
}


// Saving Data -------------------------------------------------

// From http://stackoverflow.com/a/31070150
export function runSerial(tasks) {
   let chain = Promise.resolve();
   tasks.forEach((task) => {
      chain = chain.then(() => task());
   });
   return chain;
}

export function saveChunked(baseURL, fragments) {
   const urls = [];
   const maxUrlLength = 2048; // although URLs don't have a limit per spec, we cut them precautionary

   if (fragments.length) {
      let url = baseURL;
      while (fragments.length) {
         const fragment = fragments.pop();
         if (url.length + fragment.length > maxUrlLength) {
            urls.push(url);
            url = baseURL;
         }
         url += fragment;
      }
      urls.push(url);
   }

   // call URLs one by one (to prevent data loss because xnat seems to choke on parallel requests that result in writing data)
   const tasks = _.map(urls, url => () => http.put(url));
   return runSerial(tasks);
}
