// converts the node style specifics to es6 style (this is only
// used to process the documentation)
exports.onHandleCode = (ev) => {
  ev.data.code = ev.data.code
    .replace(/module\.exports = /g, 'export default ')
    .replace(/exports = /g, 'export default ')
    .replace(/const /g, '')
    .replace(/this\.value = /g, 'value = ')
    .replace(/\\\n../g, '');
};

// Customize HTML texting/formating
exports.onHandleHTML = (ev) => {

  ev.data.html = ev.data.html
  .replace('>Repository</a>', '>Oca&nbsp;GitHub</a>')
  .replace('Oca API Document', 'Oca')
  .replace('<a href="identifiers.html">Reference</a>', '')
  .replace(new RegExp('div data-ice="importPath" class="import-path"', 'g'), 'div style="display: none;"');

  // adding the star button to the README displayed in the index page
  if (ev.data.html.indexOf(' alt="Known Vulnerabilities"></a>' !== -1)){
    ev.data.html = ev.data.html
    .replace('</head>', '<script async defer src="https://buttons.github.io/buttons.js"></script></head>')
    .replace(' alt="Known Vulnerabilities"></a>', ' alt="Known Vulnerabilities"></a> <a class="github-button" href="https://github.com/node-oca/oca" data-icon="octicon-star" data-style="mega" data-count-href="/node-oca/oca/stargazers" data-count-api="/repos/node-oca/oca#stargazers_count" data-count-aria-label="# stargazers on GitHub" aria-label="Star Oca on GitHub">Star</a>');
  }

  // replacing the domain that is hard coded in the INTRODUCTION to the relative doc location
  if (ev.data.html.indexOf('<div data-ice="manual" data-toc-name="overview">') !== -1){
    ev.data.html = ev.data.html
    .replace(new RegExp('https://node-oca.github.io/docs/', 'g'), '');
  }
}
