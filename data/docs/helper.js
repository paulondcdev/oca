// converts the node style specifics to es6 style (this is only
// used to process the documentation)
exports.onHandleCode = function (ev) {
  ev.data.code = ev.data.code
    .replace(/module\.exports = /g, 'export default ')
    .replace(/exports = /g, 'export default ')
    .replace(/const /g, '')
    .replace(/this\.value = /g, 'value = ')
    .replace(/\\\n../g, '');
};
