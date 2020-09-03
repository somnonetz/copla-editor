const autologin = false;

const host = process.env.REACT_APP_XNAT_API_URL;
// const host = 'http://localhost/xnat/REST';

const credentials = {};

const doReconstruction = false;
const doAsclepiosUpload = true;
const pipelineName = null;
const pipelineParams = {};

export { autologin, host, credentials, pipelineName, pipelineParams, doReconstruction, doAsclepiosUpload };
