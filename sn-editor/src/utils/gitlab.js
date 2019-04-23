import _ from 'lodash';


const settings = {
   url: 'https://git.tools.f4.htw-berlin.de/api/v3/projects/102/issues',
   privateToken: 'j7s7eyJP48ZLxtEAPW3y',
   assignee_id: 11,
   // labels: 'neu',
};


function openIssue(title, description, appendix) {
   const issue = {
      title,
      description: `${description}\n\n---\n\n${getAppendix(appendix)}`,
      assignee_id: settings.assignee_id,
      // labels: settings.labels,
   };

   const options = {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
         'Private-Token': settings.privateToken,
      },
      body: JSON.stringify(issue),
   };

   return window.fetch(settings.url, options);
}


function getAppendix(others) {
   const properties = _.assign({}, others, {
      build: new Date(process.env.BUILD).toLocaleString(),
      userAgent: window.navigator.userAgent,
      location: window.location,
      referrer: window.document.referrer,
      screenSize: `${window.screen.height} ⨉ ${window.screen.width} (available: ${window.screen.availHeight} ⨉ ${window.screen.availWidth})`,
      historyLength: window.history.length,
      cookiesEnabled: window.navigator.cookieEnabled,
      plugins: Array.from(window.navigator.plugins).map(p => p.name).join(', '),
      localTime: Date(),
   });

   const header = '| Property | Value |\n| -------- | ----- |\n';
   const body = _.map(properties, (value, name) => `| ${_.startCase(name)} | ${value || 'n.a.'} |`).join('\n');
   return header + body;
}

export default { openIssue };
