const path = require('path');
const fs = require('fs');
const Enum = require('enum-support');
const promisify = require('es6-promisify');
const assert = require('assert');
const formidable = require('formidable');
const TypeCheck = require('js-typecheck');
const debug = require('debug')('Oca');
const ValidationError = require('./ValidationError');
const Settings = require('./Settings');
const Action = require('./Action');
const Session = require('./Session');

// promisifying
const mkdtemp = promisify(fs.mkdtemp);
const rename = promisify(fs.rename);


// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _session = Symbol('session');
const _temporaryFolders = Symbol('temporaryFolders');

/**
 * This object is used to bridge express requests to Oca
 *
 * A handler is created by the {@link Provider} through {@link Provider.requestHandler}.
 * It can be customized to address specific provider needs, such as custom {@link authenticate},
 * {@link uploadDirectory}, {@link _errorOutput} and etc
 *
 * The availability of the actions is done by the conjunction of webfying the
 * provider and action ({@link Provider.webfyProvider}, {@link Provider.webfyAction}).
 * By default both {@link Provider} and {@link Action} are not available for requests.
 */
class RequestHandler{

  /**
   * Creates a request handler
   * @param {Session} session - Session object instance
   */
  constructor(session){
    assert(TypeCheck.isInstanceOf(session, Session), 'Invalid session');
    assert(TypeCheck.isObject(session.request), 'request not defined!');

    this[_session] = session;
    this[_temporaryFolders] = [];

    // adding the remote ip address to the autofill as remoteAddress
    try{
      this.session.autofill.remoteAddress = this.session.request.headers['x-forwarded-for'] ||
        this.session.request.connection.remoteAddress ||
        this.session.request.socket.remoteAddress ||
        this.session.request.connection.socket.remoteAddress;
    }
    catch(err){
      /* istanbul ignore next */
      console.error('Failed to set the autofill remoteAddress based on the request'); // eslint-disable-line no-console
    }
  }

  /**
   * Returns the session
   *
   * @type {Session}
   */
  get session(){
    return this[_session];
  }

  /**
   * Returns the passport authenticate middleware which is used when an {@link Action} requires
   * authentication. By default it returns the value from {@link Settings.authenticate}
   * @see http://passportjs.org/
   *
   * @return {function}
   */
  static get authenticate(){
    return Settings.authenticate;
  }

  /**
   * Returns the upload directory. By default it returns the value from
   * {@link Settings.uploadDirectory}
   *
   * @type {string}
   */
  static get uploadDirectory(){
    return Settings.uploadDirectory;
  }

  /**
   * Returns the maximum upload size in bytes supported by requests.
   * By default it returns the value from {@link Settings.uploadMaxFileSize}
   *
   * @type {number}
   */
  static get uploadMaxFileSize(){
    return Settings.uploadMaxFileSize;
  }

  /**
   * Returns if the uploaded files should keep their original names, otherwise they
   * are renamed to random unique names. By default it returns the value
   * from {@link Settings.uploadPreserveFileName}
   *
   * @type {boolean}
   */
  static get uploadPreserveFileName(){
    return Settings.uploadPreserveFileName;
  }

  /**
   * Executes an action for the request. This method is either called by Oca.middleware
   * or Oca.restful
   *
   * @param {Action} action - action that should be executed based on the request
   * @param {boolean} [checkRestVisibility=false] - boolean telling if the visibility of the
   * action through the restful should be check. This is used when the action
   * is not visible through {@link Oca.restful}, however it's executed as {@link Oca.middleware}
   * @return {Promise<*>} returns the value of the action
   * @see http://expressjs.com/en/api.html#res
   */
  async executeAction(action, checkRestVisibility=false){

    try{
      this._checkAction(action, checkRestVisibility);
      await this.setupAction(action);
      const result = await this._performAction(action);

      return result;
    }
    catch(err){
      err.status = err.status || 500;
      throw err;
    }
  }

  /**
   * Setup the action inputs based on the request
   *
   * @param {Action} action - action that should get setup
   */
  async setupAction(action){
    assert(TypeCheck.isInstanceOf(action, Action), 'Invalid action type!');

    // adding particular information about the request to the action info
    action.info.request = { // eslint-disable-line no-param-reassign
      url: this.session.request.originalUrl,
      requestMethod: RequestHandler.Method.value(this._resolveMethodName()),
    };

    let bodyFields = {};
    if (this.session.request.method === 'POST' || this.session.request.method === 'PUT'){
      bodyFields = await this._bodyFields();

      for (const inputName in bodyFields.files){
        // multiple files
        if (TypeCheck.isList(bodyFields.files[inputName])){

          for (const index in bodyFields.files[inputName]){
            if (this.constructor.uploadPreserveFileName){
              bodyFields.files[inputName][index] = await this._keepOriginalUploadName(bodyFields.files[inputName][index]);
            }
            else{
              bodyFields.files[inputName][index] = bodyFields.files[inputName][index].path;
            }
          }
        }

        // single file
        else{
          if (this.constructor.uploadPreserveFileName){
            bodyFields.files[inputName] = await this._keepOriginalUploadName(bodyFields.files[inputName]);
          }
          else{
            bodyFields.files[inputName] = bodyFields.files[inputName].path;
          }
        }
      }
    }

    // setting the action inputs based on the request parameters
    for (const inputName of action.inputNames){

      const input = action.input(inputName);

      // value set by the request
      let requestInputValue;
      if (!input.property('private')){
        const restrictRequestAccess = input.property('restrictRequestAccess');
        if (this.session.request.method === 'POST' || this.session.request.method === 'PUT'){
          if (restrictRequestAccess && inputName in bodyFields.files){
            requestInputValue = bodyFields.files[inputName];
          }
          else if (!restrictRequestAccess){

            if (inputName in bodyFields.files){
              requestInputValue = bodyFields.files[inputName];
            }
            else if (inputName in bodyFields.fields){
              requestInputValue = bodyFields.fields[inputName];
            }
          }
        }

        // GET, DELETE ...
        else if (!restrictRequestAccess && inputName in this.session.request.query){
          requestInputValue = this.session.request.query[inputName];
        }

        if (requestInputValue !== undefined){
          if (TypeCheck.isString(requestInputValue)){
            input.parseValue(requestInputValue);
          }
          else{
            input.value = requestInputValue;
          }
        }
      }

      // skipping in case the input was not set by the request
      if (requestInputValue === undefined){
        continue;
      }

      // saving the auto-fill information
      const autofillName = input.property('autofill', null);
      if (autofillName){

        // if the input name is already under autofill (assigned previously
        // then not overriding it)
        if (!(autofillName in this.session.autofill)){
          this.session.autofill[autofillName] = input.value;
        }
      }
    }

    // sets the inputs based on auto-fill
    action.session = this.session; // eslint-disable-line no-param-reassign

    // adding the cleanup temporary folders to the wrapup queue
    if (this[_temporaryFolders].length){
      this.session.wrapup.appendWrappedPromise(this._cleanupTemporaryFolders.bind(this));
    }
  }

  /**
   * Takes care of wrapping the result and rendering it. The response
   * is serialized using json (through {@link _finalize}) following the basics
   * of google's json style.
   * The output data is provided by {@link _successOutput} and {@link _errorOutput}
   * which can be customized to include additional data
   * @todo extend the supported features based on the style guide
   *
   * @param {Error} err - exception that should be outputted as error response
   * @param {*} result - data that should be outputted as success response
   * @param {Object} response - resp object created by the express server
   * @see http://expressjs.com/en/api.html#res
   * @see https://google.github.io/styleguide/jsoncstyleguide.xml
   */
  async render(err, result, response){
    assert(TypeCheck.isObject(response), 'response not defined!');

    let output = null;
    if (err){
      output = await this._errorOutput(err);
    }
    else{
      output = await this._successOutput(result);
    }

    const status = (err) ? err.status : 200;
    this._finalize(status, output, response);
  }

  /**
   * Called when the request is about to execute the requested action. At this
   * point the action is already setup, ready to be executed
   *
   * @param {Action} action - action that is about to be executed
   * @return {*} Result of the action
   *
   * @protected
   */
  _performAction(action){
    return action.execute(true, true);
  }

  /**
   * Translates an error exception to a data structure that's serialized by the
   * response. This method is called by the {@link render} in case an exception
   * is raised during the processing of the request.
   *
   * @param {Error} err - exception that should be outputted as error response
   * @return {Promise<Object>} data that is going to be serialized
   * @protected
   */
  _errorOutput(err){

    err.status = err.status || 500; // eslint-disable-line no-param-reassign

    const result = {
      error: {
        code: err.status,
        message: (TypeCheck.isInstanceOf(err, ValidationError))? err.toJson() : err.message,
      },
    };

    this._addTopLevelProperties(result);

    // adding the stack-trace information when running in development mode
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'development' || 1){
      result.error.stacktrace = err.stack.split('\n');
      debug(err.stack);
    }

    return Promise.resolve(result);
  }

  /**
   * Translates the action result value to a data structure that's
   * serialized by the response. This method is called by the {@link render}
   *
   * @param {*} value - data that should be outputted as success response
   * @return {Promise<Object>} Object that is going to be serialized
   * @protected
   */
  _successOutput(value){

    const result = {
      data: value,
    };

    this._addTopLevelProperties(result);

    return Promise.resolve(result);
  }

  /**
  * Called by the {@link render} to response the request
  *
  * @param {number} status - status of the response
  * @param {Object} output - response data generated by either {@link _successOutput}
  * or {@link _errorOutput}
  * @param {Object} response - resp object created by the express server
  * @see http://expressjs.com/en/api.html#res
  * @protected
  */
  _finalize(status, output, response){
    response.status(status).json(output);
  }

  /**
   * Auxiliary method used to promisify formidable's form.parse call
   *
   * @return {Promise<Object>}
   * @private
   */
  _bodyFields(){
    return new Promise((resolve, reject) => {
      const form = new formidable.IncomingForm();
      form.uploadDir = this.constructor.uploadDirectory;
      form.keepExtensions = true;
      form.multiples = true;
      form.encoding = 'utf-8';
      form.maxFieldsSize = this.constructor.uploadMaxFileSize;

      form.parse(this.session.request, (err, formFields, formFiles) => {

        // in case of any error
        /* istanbul ignore next */
        if (err){
          err.status = err.status || 500; // eslint-disable-line no-param-reassign
          reject(err);
          return;
        }

        resolve({files: formFiles, fields: formFields});
      });
    });
  }

  /**
   * Checks if the input action is webfied
   *
   * @param {Action} action - Input action that should be checked
   * @param {boolean} [checkRestVisibility=false] - boolean telling if the visibility of the
   * action through the restful should be check. This is used when the action
   * is not visible through {@link Oca.restful}, however it's executed as {@link Oca.middleware}
   *
   * @private
   */
  _checkAction(action, checkRestVisibility=false){
    // when the action is found
    if (action && (!checkRestVisibility || action.info.restVisibility)){

      const requestMethod = action.info.requestMethod;

      // figuring out the request method
      const methodName = this._resolveMethodName();
      let methodValue = RequestHandler.Method.None;
      if (RequestHandler.Method.has(methodName)){
        methodValue = RequestHandler.Method.value(methodName);
      }

      // making sure the action has been webfied
      if (methodValue !== RequestHandler.Method.None && requestMethod & methodValue){
        return;
      }

      // invalid request method
      const err = new Error('Invalid request method');
      err.status = 405;
      throw err;
    }
    // action not found
    else{
      const err = new Error('Action not available');
      err.status = 404;
      throw err;
    }
  }

  /**
   * Renames the uploaded file names which receive random unique names to the original uploaded file name,
   * this is done by creating an intermediated unique name folder for each of the upload files then
   * renaming them back to the original name.
   * This method is called when `uploadPreserveFileName` returns true
   *
   * @param {string} uploadFile - input file name
   * @return {string} output file name
   * @private
   */
  async _keepOriginalUploadName(uploadFile){
    const uploadFolder = await mkdtemp(path.join(this.constructor.uploadDirectory, 'file-'));
    const finalName = path.join(uploadFolder, uploadFile.name.replace(/[|:\?\*"\\\/\0<>]/g, '_')); // eslint-disable-line no-useless-escape
    await rename(uploadFile.path, finalName);

    // temporary folders removed at the end of the request
    this[_temporaryFolders].push(uploadFolder);

    return finalName;
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
    result.apiVersion = Settings.apiVersion; // eslint-disable-line no-param-reassign

    // context
    if ('context' in this.session.request.query){
      result.context = this.session.request.query.context; // eslint-disable-line no-param-reassign
    }
  }

  /**
   * Returns the request method name following the convention used
   * by the `Method Enum`
   *
   * @return {string}
   * @private
   */
  _resolveMethodName(){
    return this.session.request.method.charAt(0) + this.session.request.method.slice(1).toLowerCase();
  }

  /**
   * Promise based method that removes the temporary folders that are created
   * when `uploadPreserveFileName` is enabled
   *
   * @private
   */
  async _cleanupTemporaryFolders(){
    for (const folder of this[_temporaryFolders]){
      /* jshint loopfunc:true */
      fs.rmdir(folder, (err) => {

        // theoretically this method can be called multiple times by setupAction multiple
        // times for the same request
        delete this[_temporaryFolders][folder];

        /* istanbul ignore next */
        if (err){
          console.error(`Couldn't remove directory: ${folder}`); // eslint-disable-line no-console
        }
      });
    }
  }

  // Alternatively Request can be called directly from Oca as `Oca.Method`
  static Method = new Enum({
    None: 0,
    Get: 1,
    Post: 2,
    Put: 4,
    Delete: 8,
  });
}

module.exports = RequestHandler;
