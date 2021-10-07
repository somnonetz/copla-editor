const autologin = false;

const host = process.env.REACT_APP_XNAT_API_URL;

const credentials = {};

const doReconstruction = false;
const defaultProject = 'project1';
const defaultSubject = 'subject1';
const pipelineName = 'somnonetz-pipeline';
const pipelineParams = {
  algorithm: 'sn_getEDFHeaderdata'
};

export { autologin, host, credentials, doReconstruction, defaultProject, defaultSubject, pipelineName, pipelineParams };
