const path = require('path');
const os = require('os');
const assert = require('assert');
const stream = require('stream');
const TypeCheck = require('js-typecheck');
const Settings = require('../../Settings');
const Action = require('../../Action');
const Input = require('../../Input');
const Handler = require('../../Handler');
const WebRequest = require('../HandlerParsers/WebRequest');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _request = Symbol('request');
const _response = Symbol('response');


/**
 * Handles the web integration through expressjs and passportjs.
 *
 * It enables the execution of actions that are triggered by web requests by parsing
 * ({@link WebRequest}) the information that is passed to the action
 * ({@link Web.loadToAction}) and taking care of the serialization of the response
 * ({@link Web.output}).
 *
 * In order to tell which actions are visible by this handler, they are required to
 * be registered via a webfication process that describes their route, request method
 * and if it requires authentication.
 *
 * Actions can become webfied through a process that describes the request method
 * that should be used to access the {@link Action}. Also, this process supports
 * additional options such as if the action requires authentication and the
 * rest route: {@link Web.webfyAction}
 *
 * ```
 * Oca.webfyAction('myRegisteredAction', 'get', {auth: true, restRoute: '/myApi/action'});
 * ```
 *
 * In case of actions that require authentication (`auth: true`) Oca checks if
 * the authentication has ben executed. A passport authentication middleware can be
 * defined via {@link addBeforeAuthAction}:
 *
 * ```
 * Oca.addBeforeAuthAction(passport);
 * ```
 *
 * Also, custom middlewares can be added before the execution of any action through
 * {@link addBeforeAction}:
 *
 * ```
 * Oca.addBeforeAction((req, res, next) => {...});
 * ```
 *
 * After the webfication process, actions can be triggered in two ways:
 *
 * - *Rest support* ({@link Web.restful}):
 * Executing through a rest route, it happens when an action is webfied with `restRoute`
 * where it becomes automatically visible as part of the restful support. In order to
 * activated the restful support you need to tell Oca what is the expressjs app
 * you want to use for the rest routes:
 * ```javascript
 * const app = express();
 * // this process registers the rest route for the webfied actions
 * Oca.restful(app);
 * ```
 * The result of webfied actions through the restful support is automatically
 * encoded using google's json style guide. The only exceptions are readable stream
 * and buffer that are piped to the response
 * ({@link Web._successOutput}, {@link Web._errorOutput}).
 *
 * - *Middleware support* ({@link Web.middleware}):
 * Executing through an arbitrary route. Actions can be executed as expressjs middlewares,
 * it's done by using a `Oca.middleware` where you tell what is action registration name that
 * should be executed for the express route (make sure the action has
 * been webfied before hand). By using this feature you control the response
 * of the request, since the result of the action flows to the middleware:
 * ```javascript
 * const app = express();
 * app.get(
 *  '/foo',
 *  Oca.middleware('myRegisteredAction', (err, result, req, res) => {
 *    // some sauce...
 *  })
 * );
 * ```
 *
 * **Express req and res**
 *
 * The request and the response used by this handler are available
 * under the {@link Session} as: `session.get('req')` and `session.get('res')`.
 *
 * @see http://expressjs.com
 * @see http://passportjs.org
 */
class Web extends Handler{

  /**
   * Creates a web handler
   * @param {Session} session - Session object instance
   */
  constructor(session){
    super(session);

    this[_request] = null;
    this[_response] = null;
  }

  /**
   * Collects the parsed information from the request and loads it to the action using
   * {@link Handler.loadToAction}.
   *
   * By the default it uses the {@link WebRequest} parser if none parser is specified.
   *
   * Options assigned to the parser:
   * - uploadDirectory - value of {@link Web.uploadDirectory}
   * - uploadMaxFileSize - value of {@link Web.uploadMaxFileSize}
   * - uploadPreserveFileName - value of {@link Web.uploadPreserveFileName}
   *
   * @param {Action} action - action that should be used
   * @param {HandlerParser} parser - parser that should be used to query the
   * information which will be loaded to the action.
   * @return {Promise<*>} returns the value of the action
   */
  loadToAction(action, parser=null){
    assert(this.request, 'request not defined!');
    assert(this.response, 'response not defined!');
    assert(action instanceof Action, 'Invalid action type!');

    // creating request parser if needed
    const useParser = parser || new WebRequest(action, this.request);

    // setting the parsing options
    useParser.options.uploadDirectory = this.constructor.uploadDirectory;
    useParser.options.uploadMaxFileSize = this.constructor.uploadMaxFileSize;
    useParser.options.uploadPreserveFileName = this.constructor.uploadPreserveFileName;

    return super.loadToAction(action, useParser);
  }

  /**
   * Sets the request object created by the express server.
   *
   * It also includes the request as part of the session: `session.get('request')`
   *
   * @see http://expressjs.com/en/api.html#req
   * @param {Object} req - request object
   */
  set request(req){
    assert(TypeCheck.isObject(req) && req.method, 'Invalid request object');

    this[_request] = req;
    this.session.set('req', req);

    // adding the remote ip address to the autofill as remoteAddress
    try{
      this.session.autofill.remoteAddress = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress;
    }
    catch(err){
      /* istanbul ignore next */
      console.error('Failed to set the autofill remoteAddress based on the request'); // eslint-disable-line no-console
    }
  }

  /**
   * Returns the request object created by the express server
   *
   * @see http://expressjs.com/en/api.html#req
   * @type {Object|null}
   */
  get request(){
    return this[_request];
  }

  /**
   * Sets the response object created by the express server
   *
   * It also includes the response as part of the session: `session.get('response')`
   *
   * @see http://expressjs.com/en/api.html#res
   * @param {Object} res - response object
   */
  set response(res){
    assert(TypeCheck.isObject(res) && TypeCheck.isObject(res.locals), 'Invalid response object');

    this[_response] = res;
    this.session.set('res', res);
  }

  /**
   * Returns the response object created by the express server
   *
   * @see http://expressjs.com/en/api.html#res
   * @type {Object|null}
   */
  get response(){
    return this[_response];
  }

  /**
   * Returns the upload directory. By default it looks for the value at
   * `Settings.get('handler/web/uploadDirectory')` (default: `TMPDIR/upload`)
   *
   * @type {string}
   */
  static get uploadDirectory(){
    return Settings.get('handler/web/uploadDirectory');
  }

  /**
   * Returns the maximum upload size in bytes supported by requests.
   * By default it looks for the value at `Settings.get('handler/web/uploadMaxFileSize')`
   * (default: 10485760)
   *
   * @type {number}
   */
  static get uploadMaxFileSize(){
    return Settings.get('handler/web/uploadMaxFileSize');
  }

  /**
   * Returns if the uploaded files should keep their original names, otherwise they
   * are renamed to random unique names.
   * By default it looks for the value at `Settings.get('handler/web/uploadPreserveFileName')`
   * (default: true)
   *
   * @type {boolean}
   */
  static get uploadPreserveFileName(){
    return Settings.get('handler/web/uploadPreserveFileName');
  }

  /**
   * Makes an action available for requests.
   *
   * By doing that the action gets visible for the {@link restful} and {@link middleware} support.
   *
   * Alternatively this method can be called directly from Oca as `Oca.webfyAction(...)`
   *
   * @param {Action|string} actionClassOrName - action class or registered action name
   * @param {string|Array<string>} requestMethod - tells the request method about how the action should
   * be available, for instance: `get`, `post`, `put`, `delete` (...). Multiples methods
   * can be defined through an array of method names.
   * @param {Object} options - custom options
   * @param {boolean} [options.auth=null] - boolean telling if the action requires authorization
   * when set to `null` (default) this information is driven by the setting
   * ⚠ `handler/web/requireAuthByDefault` (default: `false`).
   * @param {string} [options.restRoute] - the rest route from which the action should be executed from
   * the {@link restful} support. You can use route parameters as well that later are translated to
   * input values to further information take a look at ({@link WebRequest}).
   */
  static webfyAction(actionClassOrName, requestMethod, {auth=null, restRoute=null}={}){
    assert((actionClassOrName !== Action && TypeCheck.isSubClassOf(actionClassOrName, Action)) || TypeCheck.isString(actionClassOrName),
    'action needs to be defined as valid string or Action class!');
    assert(TypeCheck.isString(requestMethod) || TypeCheck.isList(requestMethod),
      'requestMethod needs to be defined as string or list of method names!');
    assert(restRoute === null || TypeCheck.isString(restRoute), 'restRoute needs to be defined as string');

    const actionName = (TypeCheck.isSubClassOf(actionClassOrName, Action) ? actionClassOrName.name : actionClassOrName).toLowerCase();
    assert(Action.registeredAction(actionName), `Action: ${actionName} not found, is it registered ?`);

    // registering action
    let requestMethods = (TypeCheck.isString(requestMethod)) ? [requestMethod] : requestMethod;
    requestMethods = requestMethods.map(x => x.toLowerCase());

    // finding duplicated items
    const removeIndexes = [];
    for (let i=0, len=this._webfyActions.length; i < len; ++i){
      const webfiedAction = this._webfyActions[i];
      const action = webfiedAction.actionName;
      const method = webfiedAction.method;

      if (requestMethods.includes(method) && restRoute === webfiedAction.restRoute){

        // when the method and route is already being used by another action then removing
        // that from the registration, since the method and route will be registered
        // for a different action
        if (action in this._actionMethodToWebfiedIndex && method in this._actionMethodToWebfiedIndex[action]){
          delete this._actionMethodToWebfiedIndex[action][method];
        }

        removeIndexes.push(i);
      }
    }

    // removing duplicated items
    if (removeIndexes.length){
      for (let i=0, len=removeIndexes.length; i < len; ++i){
        this._webfyActions.splice(removeIndexes[i]-i, 1);
      }
    }

    // storing the action under the auxiliary data struct 'action method to webfied index'
    if (!(actionName in this._actionMethodToWebfiedIndex)){
      this._actionMethodToWebfiedIndex[actionName] = Object.create(null);
    }

    // adding the routes
    for (const method of requestMethods){
      const webfiedAction = Object.create(null);
      webfiedAction.actionName = actionName;
      webfiedAction.method = method;
      webfiedAction.auth = auth;
      webfiedAction.restRoute = restRoute;

      // adding the index about where the webfied action is localized
      // under the 'action method to webfied index'
      this._actionMethodToWebfiedIndex[actionName][method] = this._webfyActions.length;

      // adding the webfied action information
      this._webfyActions.push(webfiedAction);
    }
  }

  /**
   * Returns a middleware designed to execute a webfied {@link Web.webfyAction}
   * based on an arbitrary express route. Differently from {@link Web.restful} this method
   * does not response the request, instead it's done through the responseCallback
   * which passes the action error, result and the default middleware express
   * arguments, for instance:
   *
   * ```javascript
   * const app = express();
   * app.get(
   *  '/foo',
   *  Oca.middleware('myRegisteredAction', (err, result, req, res) => {
   *    ...
   *  })
   * )
   * ```
   *
   * @param {string} actionName - registered action name
   * @param {function} [responseCallback] - optional response callback that overrides
   * the default json response. The callback carries the express:
   * function(err, result, req, res, next){...}
   * @return {function}
   */
  static middleware(actionName, responseCallback){
    return this._createMiddleware(actionName, responseCallback);
  }

  /**
   * Adds a middleware that is executed before an action.
   *
   * Use this feature when you want to execute a custom middleware before the
   * execution of an action. If you want to add a middleware for an specific
   * web handler implementation then take a look at {@link Web.beforeAction}. All middlewares
   * registered by this method are executed after {@link addBeforeAuthAction}.
   *
   * Alternatively this method can be called directly from Oca as `Oca.addBeforeAction(...)`
   *
   * In order to pass a values computed by a "before middleware" to the action you need to
   * add the values to the handler session, so the action can read them later. The
   * web handler is available under `res.locals.web`, for instance:
   * ```
   * const web = res.locals.web;
   * web.session.autofill.customValue = 'something';
   * ```
   *
   * Where any input assigned with the autofill property 'someCustom' is going to be
   * assigned with the 'something' value:
   *
   * ```
   * class MyAction extends Oca.action{
   *   constructor(){
   *      super();
   *      // gets assigned with `something` value
   *      this.createInput('a: text', {autofill: 'customValue'})
   *   }
   * }
   * ```
   *
   * @param {function} middleware - expressjs middleware that should be executed
   * before the action
   *
   * @see http://expressjs.com/en/guide/using-middleware.html
   */
  static addBeforeAction(middleware){
    assert(TypeCheck.isCallable(middleware), 'middleware needs to defined as a callable');

    this._beforeActionMiddlewares.push(middleware);
  }

  /**
   * Adds a middleware that is executed before an action that requires authentication.
   *
   * Use this feature when you want to execute a custom middleware before the
   * execution of an action that requires authentication. If you want to add a
   * middleware for an specific web handler implementation then take a look at
   * {@link Web.beforeAuthAction}. All middlewares registered by this method are
   * executed before {@link addBeforeAction}.
   *
   * Use this feature to define the passportjs authentication middleware.
   *
   * Alternatively this method can be called directly from Oca as `Oca.addBeforeAuthAction(...)`
   *
   * In order to pass a values computed by a "before middleware" to the action you need to
   * add the values to the handler session, so the action can read them later. The
   * web handler is available under `res.locals.web`, for instance:
   * ```
   * const web = res.locals.web;
   * web.session.autofill.customValue = 'something';
   * ```
   *
   * Where any input assigned with the autofill property 'someCustom' is going to be
   * assigned with the 'something' value:
   *
   * ```
   * class MyAction extends Oca.action{
   *   constructor(){
   *      super();
   *      // gets assigned with `something` value
   *      this.createInput('a: text', {autofill: 'customValue'})
   *   }
   * }
   * ```
   *
   * @param {function} middleware - expressjs middleware that should be executed
   * before an action that requires authentication
   *
   * @see http://expressjs.com/en/guide/using-middleware.html
   */
  static addBeforeAuthAction(middleware){
    assert(TypeCheck.isCallable(middleware), 'middleware needs to defined as a callable');

    this._beforeAuthActionMiddlewares.push(middleware);
  }

  /**
   * Returns a list middlewares which are executed before an action.
   *
   * This method can be re-implemented by subclasses to include custom middlewares
   * that are tied with a specific web handler implementation. By default it returns
   * the middlewares added through {@link Web.addBeforeAction}
   *
   * @return {Array<function>}
   */
  static beforeAction(){
    return this._beforeActionMiddlewares.slice(0);
  }

  /**
   * Returns a list middlewares which are executed before an action that requires auth
   *
   * This method can be re-implemented by subclasses to include custom middlewares
   * that are tied with a specific web handler implementation. By default it returns
   * the middlewares added through {@link Web.addBeforeAuthAction}
   *
   * @return {Array<function>}
   */
  static beforeAuthAction(){
    return this._beforeAuthActionMiddlewares.slice(0);
  }

  /**
   * Adds the restful support to the express app.
   *
   * It works by registering the routes from webfied visible actions
   * ({@link Web.webfyAction}) to the express app. The response of an action executed
   * through rest support is done via {@link Web.output}.
   *
   * ```javascript
   * const app = express();
   * Oca.restful(app);
   * ```
   *
   * @param {Object} expressApp - expressjs application instance
   */
  static restful(expressApp){

    assert(TypeCheck.isCallable(expressApp.use), 'Invalid express instance!');

    // registering the routes
    for (const webfiedAction of this._webfyActions){
      if (webfiedAction.restRoute !== null){
        expressApp[webfiedAction.method](
          webfiedAction.restRoute,
          this._createMiddleware(webfiedAction.actionName),
        );
      }
    }
  }

  /**
   * Implements the response for an error value.
   *
   * The error response gets automatically encoded using json, following the basics
   * of google's json style guide. In case of an error status `500` the standard
   * result is ignored and a message `Internal Server Error` is used instead.
   *
   * *Output options*:
   * Currently this output does not have any options in place, therefore any
   * option passed to this output will be ignored.
   *
   * @param {Error} err - exception that should be outputted as error response
   * @param {Object} outputOptions - plain object containing custom options that should be used
   * by the output where each handler implementation contains their own set of options. This value
   * is usually driven by the `Action.metadata.result`.
   * @return {Promise<Object>} data that is going to be serialized
   * @protected
   */
  _errorOutput(err, outputOptions){

    let result = super._errorOutput(err);
    const status = result.error.code;
    this._addTopLevelProperties(result);

    // should not leak any error message for the status code 500
    if (status === 500){
      result = 'Internal Server Error';
    }

    this.response.status(status).json(result);

    return result;
  }

  /**
   * Implements the response for a success value.
   *
   * *Output options*: It can be used to defined custom headers to the response, by adding the 'header'
   * entry under the options where the children should represent a header type & value. Make
   * sure that the children are defined the using the camelCase convention, for
   * instance:
   *
   * ```
   * // 'Content-Type' header
   * options.header.contentType = 'application/octet-stream'
   * ```
   *
   * Also, headers can be defined through a before action middlewares
   * ({@link Web.addBeforeAction} and {@link Web.addBeforeAuthAction})
   *
   * Readable streams are piped using 'application/octet-stream' by default
   * (if it has not been defined).
   *
   * Non readable stream values are automatically encoded using json, following the
   * basics of google's json style guide.
   *
   * @param {*} value - value to be outputted
   * @param {Object} outputOptions - plain object containing custom options that should be used
   * by the output where each handler implementation contains their own set of options. This value
   * is usually driven by the `Action.metadata.result`.
   * @return {Object} Object that is going to be serialized
   * @see https://google.github.io/styleguide/jsoncstyleguide.xml
   * @protected
   */
  _successOutput(value, outputOptions){

    const result = super._successOutput(value);

    // setting header
    this._setResponseHeaders(outputOptions);

    // readable stream
    if (result instanceof stream.Readable){

      // setting a default content-type for readable stream in case
      // it has not been set previously
      if (!(outputOptions.header && outputOptions.header.contentType)){
        this.response.setHeader('Content-Type', 'application/octet-stream');
      }

      result.pipe(this.response);
      return;
    }

    // json output
    this._addTopLevelProperties(result);
    this.response.status(200).json(result);

    return result;
  }

  /**
   * Looks for any header member defined as part of the options and sets them
   * to the response header. It expects a camelCase name convention for the header name
   *  where it gets translated to the header name convention, for instance:
   * 'options.header.contentType' translates to 'Content-Type'.
   *
   * @param {*} options - options passed to the output
   * @private
   */
  _setResponseHeaders(options){

    if (options.header){
      for (const headerName in options.header){
        const convertedHeaderName = headerName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

        // assigning a header value to the response
        this.response.setHeader(convertedHeaderName, options.header[headerName]);
      }
    }
  }

  /**
  * Appends common properties to the output
  *
  * @param {Object} result - input result object
  * @see https://google.github.io/styleguide/jsoncstyleguide.xml
  * @private
  */
  _addTopLevelProperties(result){

    // api version
    result.apiVersion = Settings.get('apiVersion');

    // context
    if ('context' in this.request.query){
      result.context = this.request.query.context;
    }
  }

  /**
   * Returns a wrapped middleware which makes sure that actions requiring auth
   * use the middleware otherwise the middleware is skipped
   *
   * @param {function} middleware - auth middleware
   * @return {function}
   * @private
   */
  static _wrapAuthMiddleware(middleware){
    return (req, res, next) => {
      if (res.locals.web.requireAuth){
        middleware(req, res, next);
      }
      else{
        next();
      }
    };
  }

  /**
   * Auxiliary method that creates a middleware containing an action
   *
   * @param {string} actionName - registered action name which should be executed by the middleware
   * @param {function} [responseCallback] - optional response callback that overrides
   * the default json response. The callback carries the express:
   * function(err, result, req, res, next){...}
   * @return {function}
   * @private
   */
  static _createMiddleware(actionName, responseCallback=null){

    const checkActionMiddleware = (req, res, next) => {
      const method = req.method.toLowerCase();

      // checking if the action is webfied for the current request method
      const normalizedName = actionName.toLowerCase();
      if (!(method in this._actionMethodToWebfiedIndex[normalizedName])){
        return res.sendStatus(404);
      }

      // storing the request handler inside of the res.locals, so this object
      // can be accessed later by the action
      res.locals.web = Handler.create('web', normalizedName);
      res.locals.web.request = req;
      res.locals.web.response = res;

      const actionDataIndex = this._actionMethodToWebfiedIndex[normalizedName][method];
      res.locals.web.requireAuth = this._webfyActions[actionDataIndex].auth;

      next();
    };

    // creating the middleware that executes the action
    const actionMiddleware = (req, res, next) => {

      // assuring the authentication has been done
      assert(res.locals.web.requireAuth !== undefined);
      assert(!res.locals.web.requireAuth || req.user !== undefined, "Can't execute an auth action without authentication!");

      // creates the action
      const web = res.locals.web;
      const action = Action.create(actionName, web.session);
      const render = (!TypeCheck.isCallable(responseCallback));

      // executing the action middleware
      web.loadToAction(action).then(() => {
        return action.execute();
      }).then((result) => {
        if (render){
          web.output(result, action.metadata.result);
        }
        // callback that handles the response (Oca.middleware)
        else{
          responseCallback(null, result, req, res, next);
        }
      }).catch((err) => {
        if (render){
          web.output(err);
        }
        // callback that handles the response (Oca.middleware)
        else{
          responseCallback(err, null, req, res, next);
        }
      });
    };

    const WebHandlerClass = this.registeredHandler('web', actionName);

    // final middleware list
    const result = [checkActionMiddleware,
      ...WebHandlerClass.beforeAuthAction().map(this._wrapAuthMiddleware),
      ...WebHandlerClass.beforeAction(),
      actionMiddleware,
    ];

    return result;
  }

  static _beforeAuthActionMiddlewares = [];
  static _beforeActionMiddlewares = [];
  static _webfyActions = [];
  static _actionMethodToWebfiedIndex = Object.create(null);
}

// default settings
Settings.set('handler/web/uploadDirectory', path.join(os.tmpdir(), 'upload'));
Settings.set('handler/web/uploadMaxFileSize', 10 * 1024 * 1024);
Settings.set('handler/web/uploadPreserveFileName', true);
Settings.set('handler/web/requireAuthByDefault', false); // ⚠ BE CAREFUL

// registering input properties
Input.registerProperty('filePath', 'restrictWebAccess', true);

// registering handler
Handler.registerHandler(Web);

// exporting module
module.exports = Web;
