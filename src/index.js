const modules = {};
const shortcuts = {};

// modules
modules.Error = require('./Error');
modules.Util = require('./Util');
modules.Settings = require('./Settings');
modules.Input = require('./Input');
modules.Action = require('./Action');
modules.Tasks = require('./Tasks');
modules.Session = require('./Session');
modules.Handler = require('./Handler');
modules.Reader = require('./Reader');
modules.Writer = require('./Writer');
modules.Ext = require('./Ext');

// handler shortcuts
shortcuts.createHandler = modules.Handler.create.bind(modules.Handler);
shortcuts.registerHandler = modules.Handler.registerHandler.bind(modules.Handler);

// action shortcuts
shortcuts.createAction = modules.Action.create.bind(modules.Action);
shortcuts.registerAction = modules.Action.registerAction.bind(modules.Action);

// web handler shortcuts
const webHandler = modules.Ext.Handlers.Web;
shortcuts.webfyAction = webHandler.webfyAction.bind(webHandler);
shortcuts.addBeforeAction = webHandler.addBeforeAction.bind(webHandler);
shortcuts.addBeforeAuthAction = webHandler.addBeforeAuthAction.bind(webHandler);
shortcuts.middleware = webHandler.middleware.bind(webHandler);
shortcuts.restful = webHandler.restful.bind(webHandler);

Object.assign(module.exports, modules, shortcuts);
