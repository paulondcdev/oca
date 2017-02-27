const assert = require('assert');
const stream = require('stream');
const EventEmitter = require('events');
const TypeCheck = require('js-typecheck');
const ValidationFail = require('./Error/ValidationFail');
const debug = require('debug')('Oca');
const Session = require('./Session');
const minimatch = require('minimatch');
const Action = require('./Action');
const HandlerParser = require('./HandlerParser');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _session = Symbol('session');


/**
 * A handler is used to bridge an execution method to Oca.
 *
 * The data received by the handler is parsed through a {@link HandlerParser}. The parsed
 * data is then loaded to the action via {@link Handler.loadToAction}.
 *
 * The output data of a handler is done via {@link Handler.output}. The way the data is serialized
 * is determined by the handler implementation ({@link Handler._successOutput}, {@link Handler._errorOutput}).
 * Usually it gets serialized using json, however there is the stream support exception where any
 * Readable stream and Buffer are streamed as output (it may vary per handler basis).
 *
 * Handlers are created by their registration name ({@link Handler.registerHandler}), the creation
 * is done by {@link Handler.create} or `Oca.createHandler`:
 *
 * ```
 * // creating an instance of an action
 * const action = new MyAction();
 *
 * // creating a handle based on the handler registration name
 * const handler = Oca.createHandler('myHandler');
 *
 * // loading the parsed information to the action
 * handler.loadToAction(action).then(() =>{
 *
 *    // executing action
 *    return action.execute();
 *
 * // success output
 * }).then((result) => {
 *    handler.output(result);
 *
 * // error output
 * }).catch((err) => {
 *    handler.output(err);
 * });
 * ```
 *
 * **Tip:** You can set the env variable `NODE_ENV=development` to get the traceback information
 * included in the error output
 */
class Handler{

  /**
   * Creates a Handler
   * @param {Session} session - Session object instance
   */
  constructor(session){
    assert(session instanceof Session, 'Invalid session');

    this[_session] = session;
  }

  /**
   * Results a value through the handler
   *
   * In case the value is an exception then it's treated as {@link Handler._errorOutput}
   * otherwise the value is treated as {@link Handler._successOutput}.
   *
   * When `finalizeSession` is enabled (default) the {@link Handler.session} gets finalized
   * in the end of the output process. Any error raised during session finalization is emitted by
   * the {@link Handler.onFinalizeError} event.
   *
   * @param {*} value - raw value that should be resulted by the handler
   * @param {boolean} [finalizeSession=true] - tells if it should finalize the session
   * ({@link Session.finalize})
   */
  output(value, finalizeSession=true){
    if (value instanceof Error){
      this._errorOutput(value);
    }
    else{
      this._successOutput(value);
    }

    // the session finalization runs in parallel, since it does secondary tasks
    // (such as clean-up, logging, etc...) there is no need to await for that
    if (finalizeSession){
      this.session.finalize().then().catch((err) => {
        process.nextTick(() => {
          this.constructor._sessionEvent.emit('error', err);
        });
      });
    }
  }

  /**
   * Translates an {@link Error} to a data structure that's serialized as output. Therefore
   * this method is called by the {@link Handler.output} when an exception is passed
   * as output.
   *
   * Any error can carry a status code. It helps to identify the kind of error, by default it
   * follows the HTTP status code, however you can assign any value you want that may help client to be
   * aware about type of error.
   *
   * The status can be done by assigning a `status` code to the error (for instance ```err.status = 501;```).
   * This practice can be found in the errors shipped with oca ({@link Conflict}, {@link NoContent},
   * {@link NotFound} and {@link ValidationFail}). In case none status is found in the error then `500`
   * is used automatically.
   *
   * Also, in case of a {@link ValidationFail} it gets converted to json ({@link ValidationFail.toJson}).
   *
   * **Tip:** You can set the env variable `NODE_ENV=development` to get the traceback information
   * included in the error output
   *
   * @param {Error} err - Exception that should be serialized as en error output
   * @return {Object} serialized data
   * @protected
   */
  _errorOutput(err){
    err.status = err.status || 500;

    const result = Object.create(null);
    result.error = Object.create(null);
    result.error.code = err.status;
    result.error.message = (err instanceof ValidationFail)? err.toJson() : err.message;

    // adding the stack-trace information when running in development mode
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'development'){
      process.stderr.write(`${err.stack}\n`);
      result.error.stacktrace = err.stack.split('\n');
      debug(err.stack);
    }

    return result;
  }

  /**
   * Translates the success value to a data structure that is serialized as output.
   * Usually the value gets serialized using json, however there is the stream support
   * exception where any Readable stream and Buffer are streamed as output
   * (it should be supported by handler basis). This method is called by
   * {@link Handler.output}.
   *
   * @param {*} value - value to be outputted
   * @return {Object} Object that is going to be serialized
   * @protected
   */
  _successOutput(value){

    // stream output
    if (value instanceof Buffer){
      const bufferStream = new stream.PassThrough();
      bufferStream.end(value);

      return bufferStream;
    }
    else if (value instanceof stream.Readable){
      return value;
    }

    // default result
    const result = Object.create(null);
    result.data = value;

    return result;
  }

  /**
   * Collects the handler information through a {@link HandlerParser} and loads it
   * to the {@link Action}.
   *
   * Changes done by this method to the action:
   * - Assigns the {@link Handler.session} to the action ({@link Action.session})
   * - Modifies the action input values based on the information collected by the parser
   * - May modify the {@link Session.autofill} based on the information collected by the parser
   * ({@link HandlerParser.parseAutofillValues})
   *
   * @param {Action} action - action that should be used
   * @param {HandlerParser} parser - parser that should be used to query the
   * information which will be loaded to the action.
   */
  async loadToAction(action, parser){

    assert(action instanceof Action, 'Invalid action!');
    assert(parser instanceof HandlerParser, 'Invalid handler parser');

    action.session = this.session;

    const inputValues = await parser.parseInputValues();
    const autofillValues = await parser.parseAutofillValues();

    for (const inputName in inputValues){
      action.input(inputName).value = inputValues[inputName];
    }

    for (const autofillName in autofillValues){
      this.session.autofill[autofillName] = autofillValues[autofillName];
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
   * Creates a handler based on the registered name
   *
   * Alternatively this method can be called directly from Oca as `Oca.createHandler(...)`
   *
   * @param {string} handlerName - registered handler name
   * @param {string} [mask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler (it allows to have
   * custom handler implementations for specific masks)
   * @param {Session} [session] - session used by the handler, if not specified it creates
   * a new session instance
   * @return {Handler}
   */
  static create(handlerName, mask='*', session=new Session()){
    const HandlerClass = this.registeredHandler(handlerName, mask);

    // creates a new instance
    if (!HandlerClass){
      throw new Error(`Execution Handler: ${handlerName}, is not registered!`);
    }

    return new HandlerClass(session);
  }

  /**
   * Register an {@link Handler} type to the available handlers
   *
   * @param {Handler} handlerClass - handler implementation that will be registered
   * @param {string} [handlerName] - string containing the registration name for the
   * handler. In case of an empty string, the registration is done by using the name
   * of the type (this information is stored in lowercase)
   * @param {string} [mask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler (it allows to have
   * custom handler implementations for specific masks)
   */
  static registerHandler(handlerClass, handlerName='', mask='*'){
    assert(TypeCheck.isSubClassOf(handlerClass, Handler), 'Invalid handler type!');
    assert(TypeCheck.isString(handlerName), 'Invalid handler registration name!');
    assert(TypeCheck.isString(mask), 'mask needs to be defined as string');
    assert(mask.length, 'mask cannot be empty');

    const normalizedMask = mask.toLowerCase();
    const handlerNameFinal = ((handlerName === '') ? handlerClass.name : handlerName).toLowerCase();

    // validating name
    assert(handlerNameFinal.length, 'handler name cannot be empty');
    assert((/^([\w_\.\-])+$/gi).test(handlerNameFinal), `Invalid handler name: ${handlerNameFinal}`); // eslint-disable-line no-useless-escape

    const handlers = new Map();
    for (const key of Array.from(this._registeredHandlers.keys()).reverse()){

      if (key[0] === handlerName && key[1] === normalizedMask){
        continue;
      }

      handlers.set(key, this._registeredHandlers.get(key));
    }

    handlers.set([handlerNameFinal, normalizedMask], handlerClass);

    // reversed map
    const reversedMap = new Map();
    for (const key of Array.from(handlers.keys()).reverse()){
      reversedMap.set(key, handlers.get(key));
    }

    this._registeredHandlers = reversedMap;
  }

  /**
   * Returns the handler type based on the registration name
   *
   * @param {string} handlerName - name of the registered handler type
   * @param {string} [mask='*'] - optional mask that supports a glob syntax used
   * to match a custom registered handler
   * @return {Handler|null}
   */
  static registeredHandler(handlerName, mask='*'){
    assert(TypeCheck.isString(handlerName), 'handlerName needs to be defined as string');
    assert(TypeCheck.isString(mask), 'mask needs to be defined as string');

    const normalizedHandlerName = handlerName.toLowerCase();
    const normalizedMask = mask.toLowerCase();

    for (const key of this._registeredHandlers.keys()){
      if (key[0] === normalizedHandlerName && (key[1] === '*' || minimatch(normalizedMask, key[1]))){
        return this._registeredHandlers.get(key);
      }
    }

    return null;
  }

  /**
   * Returns a list containing the names of the registered handler types
   *
   * @type {Array<string>}
   */
  static get registeredHandlerNames(){
    const result = new Set();

    for (const [registeredHandleName] of this._registeredHandlers.keys()){
      result.add(registeredHandleName);
    }

    return [...result];
  }

  /**
   * Returns a list of registered handler makers for the input handler name
   *
   * @param {string} handlerName - registered handler name
   * @return {Array<string>}
   */
  static registeredHandlerMasks(handlerName){
    const result = [];

    const normalizedName = handlerName.toLowerCase();

    for (const [registeredHandleName, registeredMask] of this._registeredHandlers.keys()){
      if (registeredHandleName === normalizedName){
        result.push(registeredMask);
      }
    }

    return result;
  }

  /**
   * Adds a listener for an exception raised by the {@link Session.finalize} inside of
   * {@link Handler.output}.This event passes the error as argument.
   *
   * Currently this event is static to make easy for developers to hook it when
   * it occurs, if none listener is registered to it then the error is thrown,
   * a stack trace is printed, and the Node.js process exits.
   *
   * ```
   * // registering a listener to the session error
   * Oca.Handler.onFinalizeError((err => {
   *    console.error(err.stack);
   * }));
   * ```
   *
   * @param {function} listener - listener function
   */
  static onFinalizeError(listener){
    this._sessionEvent.on('error', listener);
  }

  static _sessionEvent = new EventEmitter();
  static _registeredHandlers = new Map();
}


module.exports = Handler;
