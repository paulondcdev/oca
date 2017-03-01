const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Tasks = require('./Tasks');
const Settings = require('./Settings');
const LruCache = require('./Util/LruCache');


// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _arbitraryData = Symbol('_arbitraryData');
const _autofill = Symbol('autofill');
const _wrapup = Symbol('wrapup');
const _resultCache = Symbol('resultCache');
const _terminated = Symbol('terminated');

/**
 * A session is used to store the data that is shared between actions.
 *
 * This object is created automatically by {@link Handler.create} and
 * {@link Action.create}.
 */
class Session{

  /**
   * Creates a session
   *
   * @param {Object} [autofill={}] - plain object containing the autofill values. This
   * feature is used to set the initial input value for inputs that contain the `autofill`
   * property. It works by looking if the value of the autofill input property is under the
   * {@link Session.autofill} then if found it sets the input value with the value of the
   * {@link Session.autofill}. This process occurs when a session is assigned to the action
   * ({@link Action.session}).
   * @param {Tasks} [wrapup] - task object used to hold actions and promises that are triggered
   * when finalizing ({@link finalize}) the session
   * @param {LruCache} [resultCache] - cache used to store results of cacheable actions
   */
  constructor(autofill={}, wrapup=null, resultCache=null){

    assert(TypeCheck.isPlainObject(autofill), 'autofill needs to defined with a plain object');
    assert(wrapup === null || wrapup instanceof Tasks, 'wrapup needs to defined with a Tasks object or null');
    assert(resultCache === null || resultCache instanceof LruCache, 'resultCache needs to defined with a LruCache object or null');

    this[_autofill] = autofill;
    this[_wrapup] = (wrapup === null) ? new Tasks() : wrapup;
    this[_resultCache] = (resultCache === null) ? new LruCache(Settings.get('session/lruCacheSize'), Settings.get('session/lruCacheLifespan') * 1000) : resultCache;
    this[_terminated] = false;

    // generic container used to store arbitrary inside of the session
    this[_arbitraryData] = Object.create(null);
  }

  /**
   * Returns a plain object containing the autofill data, you can alter
   * this object to include additional autofill values.
   * This feature is used to set the initial input value for inputs that contain the `autofill`
   * property. It works by looking if the value of the autofill input property is under the
   * {@link Session.autofill} then if found it sets the input value with the value of the
   * {@link Session.autofill}. This process occurs when a session is assigned to the action
   * ({@link Action.session}).
   *
   * When inputs that contain the property `autofill` are initialized through the
   * {@link Handler} they will try to find their values under the autofill,
   * however if a value is not defined for them they will assign their input value
   * to the autofill data automatically.
   *
   * @type {Object}
   */
  get autofill(){
    return this[_autofill];
  }

  /**
   * Returns the tasks object used to hold actions and promises that are triggered
   * when finalizing ({@link finalize}) the session. Wrapup actions can be used to avoid
   * the execution of an action that may be triggered multiple times across
   * nested actions where ideally it should be executed only once in the end,
   * after all nested actions are done.
   *
   * @type {Tasks}
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
   * Sets a key & value under the session. This is used to store arbitrary data
   * that is not related with all handlers, for instance the request object
   * created by express is assigned to the session through this method by the
   * web handler.
   *
   * @param {string} key - name of the key
   * @param {*} value - value for the key
   */
  set(key, value){
    assert(TypeCheck.isString(key), 'key needs to defined as string');

    this[_arbitraryData][key] = value;
  }

  /**
   * Returns the value assigned for the key
   *
   * @param {string} key - name of the key
   * @param {*} [defaultValue] - optional value returned when the key is not assigned
   * @return {*}
   */
  get(key, defaultValue=undefined){
    if (key in this[_arbitraryData]){
      return this[_arbitraryData][key];
    }

    return defaultValue;
  }

  /**
   * Returns a boolean telling if the input key is under the arbitrary data
   *
   * @param {string} key - key name
   * @return {boolean}
   */
  has(key){
    return (key in this[_arbitraryData]);
  }

  /**
   * Returns the keys included in the arbitrary data
   *
   * @type {Array<string>}
   */
  get keys(){
    return Object.keys(this[_arbitraryData]);
  }

  /**
   * Terminates the session by executing the {@link wrapup}
   * tasks and flushing the {@link lruCache}.
   *
   * This is called by the {@link Handler} during the execution of
   * {@link Handler.output}.
   *
   * @return {Promise}
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

    return true;
  }
}

// Setting the default settings:

// lruCacheSize
// Sets in bytes the size of the LRU cache available for the execution of actions.
// (default: `20 mb`)
Settings.set('session/lruCacheSize', 20 * 1012 * 1024);

// lruCacheLifespan
// Sets in seconds the amount of time that an item under LRU cache should
// be kept alive. This cache is defined by {@link Session.resultCache}
// (default: `10 seconds`)
Settings.set('session/lruCacheLifespan', 10);

module.exports = Session;
