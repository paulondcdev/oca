const assert = require('assert');
const TypeCheck = require('js-typecheck');
const ExecutionQueue = require('./ExecutionQueue');
const Settings = require('./Settings');
const LruCache = require('./Util/LruCache');


// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _autofill = Symbol('autofill');
const _request = Symbol('request');
const _wrapup = Symbol('wrapup');
const _resultCache = Symbol('resultCache');
const _terminated = Symbol('terminated');

/**
 * A session is used to store data that is shared between providers and
 * actions.
 *
 * This object is created automatically by the {@link RequestHandler} when a provider
 * is created for the request
 */
class Session{

  /**
   * Creates a session
   *
   * @param {Object} [request] - express request object or null
   * @param {Object} [autofill={}] - plain object containing the autofill values. This
   * is feature is used to set the initial input value for inputs that contain the `autofill`
   * property. It works by looking if the value of the autofill property is under the
   * {@link autofill} then if found setting the input value with the value of the {@link autofill}
   * @param {ExecutionQueue} [wrapup] - queue used to hold actions and promises that are triggered
   * when finalizing ({@link finalize}) the session
   * @param {LruCache} [resultCache] - cache used to store results of cacheable actions
   */
  constructor(request=null, autofill={}, wrapup=null, resultCache=null){

    assert(request === null || request.method, 'request needs to be defined with a request object or null');
    assert(TypeCheck.isPlainObject(autofill), 'autofill needs to defined with a plain object');
    assert(wrapup === null || TypeCheck.isInstanceOf(wrapup, ExecutionQueue), 'wrapup needs to defined with a ExecutionQueue object or null');
    assert(resultCache === null || TypeCheck.isInstanceOf(resultCache, LruCache), 'resultCache needs to defined with a LruCache object or null');

    this[_autofill] = autofill;
    this[_request] = request;
    this[_wrapup] = (wrapup === null) ? new ExecutionQueue() : wrapup;
    this[_resultCache] = (resultCache === null) ? new LruCache(Settings.lruCacheSize, Settings.lruCacheLifespan * 1000) : resultCache;
    this[_terminated] = false;
  }

  /**
   * Returns a plain object containing the autofill data, you can alter
   * this object to include additional autofill values. It works by looking if the
   * value of the autofill property is under the autofill then
   * if found it assigns the input value with the value found under the autofill
   *
   * When inputs that contain the property `autofill` are initialized through the
   * {@link RequestHandler} they will try to find their values under the autofill,
   * however if a value is not defined for them they will assign their input value
   * to the autofill data automatically
   *
   * @type {Object}
   */
  get autofill(){
    return this[_autofill];
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
   * Returns the queue used to hold actions and promises that are triggered
   * when finalizing ({@link finalize}) the session. Wrapup actions can be used to avoid
   * the execution of an action that may be triggered multiple times across
   * nested actions where ideally it should be executed only once in the end,
   * after all nested actions are done.
   *
   * @type {ExecutionQueue}
   */
  get wrapup(){
    return this[_wrapup];
  }

  /**
   * Returns the {@link LruCache} cache used to store results of cacheable actions
   *
   * @type {LruCache}
   */
  get resultCache(){
    return this[_resultCache];
  }

  /**
   * Terminates the session by executing the {@link wrapup}
   * queue and flushing the {@link lruCache}.
   *
   * returns {Promise}
   */
  async finalize(){

    if (this[_terminated]){
      throw new Error('Session has been already finalized!');
    }

    this[_terminated] = true;

    if (!this.wrapup.isEmpty){

      await this.wrapup.execute();
      this.wrapup.clear();
    }

    this.resultCache.flush();
  }
}

module.exports = Session;
