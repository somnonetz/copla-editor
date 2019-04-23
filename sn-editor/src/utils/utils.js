export const sleep = s => new Promise(resolve => setTimeout(resolve, s * 1000));

export default { sleep };
