/*
   HTTP Helper especially for XNAT

   From https://github.com/github/fetch
 */

import events from './Events';
import gitlab from 'utils/gitlab';


const isProductionMode = process.env.NODE_ENV === 'production';
const errorCache = {};


// HTTP Methods -----------------------------------------------

export function get(input, options = {}) {
   options.method = 'GET';
   return fetch(input, options);
}

export function post(input, options = {}) {
   options.method = 'POST';
   return fetch(input, options);
}

export function put(input, options = {}) {
   options.method = 'PUT';
   return fetch(input, options);
}

export function del(input, options = {}) {
   options.method = 'DELETE';
   return fetch(input, options);
}


// … as text --------------------------------------------------

export function getText(input, options = {}) {
   return get(input, options).then(response => response.text());
}

export function postText(input, options = {}) {
   return post(input, options).then(response => response.text());
}

export function putText(input, options = {}) {
   return put(input, options).then(response => response.text());
}


// … as JSON --------------------------------------------------

export function getJSON(input, options = {}) {
   return get(input, options).then(parseJSON);
}

export function postJSON(input, options = {}) {
   return post(input, options).then(parseJSON);
}

export function putJSON(input, options = {}) {
   return put(input, options).then(parseJSON);
}


// The main fetch function ------------------------------------

export function fetch(input, options = {}) {
   options.credentials = options.credentials || 'include';
   options.mode = options.mode || 'cors';
   events.emit('request', input);
   return window.fetch(input, options).then(checkStatus);
}


// Private Methods --------------------------------------------

function checkStatus(response) {
   return new Promise((resolve, reject) => {

      if (response.url.includes('template/Login.vm') // XNAT specific
         || ( // WARNING: IE specific. This is fragile but works at the moment.
            response.status !== 400 && // submitted values were not valid, will be handled in the next step
            response.status !== 404 && // misses (e.g. for not yet existing lab pages) are `text/html` but OK
            response.status !== 500 && // Internal Server Error are `text/html`
            // as `response.url` is not available and status is 200 because redirects are followed
            // so we check for type `text/html` as an indicator for the login page (nearly all other requests have other types)
            response._bodyBlob && /^text\/html;charset/.test(response._bodyBlob.type) // eslint-disable-line no-underscore-dangle
      )) {
         events.emit('sessionEnded');
      }

      // 400 means a request was wrongly crafted, e.g. code is wrong, so open an issue in the background
      if (response.status === 400 && isProductionMode) {
         response.clone().text()
            .then((html) => {
               if (errorCache[html]) return; // we already opened an issue for this error in this session
               if (html.includes('<p>User not found.</p>')) return; // password reset for wrong user; this is fine

               const title = response.statusText || 'Error';
               const description = `\`\`\`\n${html}\n\`\`\``;
               const appendix = {
                  URL: response.url,
               };
               gitlab.openIssue(title, description, appendix);
               errorCache[html] = true;
            });
      }

      // reject any erroneous response
      if (response.status < 200 || response.status >= 300) {
         events.emit('error', response);
         response.text().then((html) => {
            response.html = html;
            reject(response);
         });
      }
      // if nothing bad happened, we're fine
      else {
         events.emit('response', response);
         resolve(response);
      }
   });
}

function parseJSON(response) {
   return response.json().then((json) => {
      if (json.ResultSet && json.ResultSet.Result) {
         return json.ResultSet.Result;
      }
      return json;
   });
}
