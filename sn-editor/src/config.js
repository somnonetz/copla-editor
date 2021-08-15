
// const host = 'http://localhost/xnat/REST';
const host = process.env.REACT_APP_XNAT_API_URL;

// enable auto login
// example
// const credentials = {
//     username: 'admin',
//     password: 'admin',
// };
const autologin = false;
const credentials = {};

// enable reconstruction pipeline
// example:
// const doReconstruction = true;
// const pipelineName = 'somnonetz-pipeline';
// const pipelineParams = {
//   algorithm: 'sn_getEDFHeaderdata'
// };
const doReconstruction = false;
const pipelineName = null;
const pipelineParams = {};

// enable ASCLEPIOS integration
const doAsclepiosUpload = process.env.REACT_APP_DO_ASCLEPIOS_UPLOAD;

export { autologin, host, credentials, pipelineName, pipelineParams, doReconstruction, doAsclepiosUpload };
