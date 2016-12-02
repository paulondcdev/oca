module.exports.Util = require('./Util');
const Settings = require('./Settings');

module.exports.Settings = Settings;
module.exports.ValidationError = require('./ValidationError');
module.exports.Input = require('./Input');
module.exports.Action = require('./Action');
module.exports.ExecutionQueue = require('./ExecutionQueue');
module.exports.Session = require('./Session');

const RequestHandler = require('./RequestHandler');
const Provider = require('./Provider');

module.exports.Provider = Provider;
module.exports.RequestHandler = RequestHandler;
module.exports.Bundle = require('./Bundle');

// shortcuts
module.exports.initialize = (...args) => {
  return Settings.initialize(...args);
};

module.exports.middleware = (...args) => {
  return Provider.middleware(...args);
};

module.exports.restful = (...args) => {
  return Provider.restful(...args);
};

module.exports.createProvider = (...args) => {
  return Provider.create(...args);
};

module.exports.registerAction = (...args) => {
  return Provider.registerAction(...args);
};

module.exports.webfyAction = (...args) => {
  return Provider.webfyAction(...args);
};

module.exports.webfyProvider = (...args) => {
  return Provider.webfyProvider(...args);
};

module.exports.registerProvider = (...args) => {
  return Provider.registerProvider(...args);
};

module.exports.Method = RequestHandler.Method;
