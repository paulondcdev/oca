const fs = require('fs');
const assert = require('assert');
const tmp = require('tmp');
const mkdirp = require('mkdirp');
const TypeCheck = require('js-typecheck');
const path = require('path');


/**
 * Provides access to the general configuration which is used by the features
 * provided by Oca. The settings only take effect upon calling {@link initialize}
 *
 * ```javascript
 * const express = require('express');
 * const Oca = require('oca');
 * // ...
 * Oca.initialize();
 * // ...
 * var app = express();
 * app.use(Oca.restful());
 * ```
 */
class Settings{

  /**
   * Initializes the settings used by Oca. This method should always
   * be called in your app.
   * Alternatively this can be called as `Oca.initialize()`
   *
   * ```javascript
   * const express = require('express');
   *
   * var app = express();
   * Settings.uploadDirectory = '/some/custom/folder';
   * Settings.initialize();
   * app.use(Oca.restful());
   * ```
   */
  static initialize(){
    this._data.initialized = true;

    // default values
    if (this.uploadDirectory === undefined){
      this.uploadDirectory = path.join(tmp.tmpdir, 'upload');
    }

    if (this.uploadMaxFileSize === undefined){
      this.uploadMaxFileSize = 10 * 1024 * 1024;
    }

    if (this.lruCacheSize === undefined){
      this.lruCacheSize = 20 * 1012 * 1024;
    }

    if (this.uploadPreserveFileName === undefined){
      this.uploadPreserveFileName = true;
    }

    if (this.lruCacheLifespan === undefined){
      this.lruCacheLifespan = 20;
    }

    if (this.authenticate === undefined){
      this.authenticate = null;
    }

    if (this.apiVersion === undefined){
      this.apiVersion = '';

      try{
        this.apiVersion = require(path.join(process.cwd(), 'package.json')).version; // eslint-disable-line
      }
      catch(err){
        /* istanbul ignore next */
        console.warning('Unable to find package.json under the CWD'); // eslint-disable-line no-console
      }
    }
  }

  /**
   * Sets the api version about the application that is using this library, this information
   * is used as part of the request response (default: version found inside of `CWD/package.json`)
   * @see http://semver.org
   *
   * @param {string} version - version followed by semver convention
   */
  static set apiVersion(version){
    assert(TypeCheck.isString(version), 'version needs to be defined as string');

    this._data.apiVersion = version;
  }

  /**
   * Returns the api version about the application that is using this library
   *
   * @type {string}
   */
  static get apiVersion(){
    this._checkInitialization();

    return this._data.apiVersion;
  }

  /**
   * Sets a passport authenticate middleware which is used when an {@link Action} requires
   * authentication. This information is used by {@link RequestHandler.authenticate}
   * (default: `null`)
   *
   * @param {function|null} passportAuth - passport middleware authentication
   * @see http://passportjs.org/
   */
  static set authenticate(passportAuth){
    assert(passportAuth === null || TypeCheck.isCallable(passportAuth), 'Invalid passport authenticate');

    this._data.authenticate = passportAuth;
  }

  /**
   * Returns the passport authenticate middleware which is used when an {@link Action} requires
   * authentication. This information is used by {@link RequestHandler.authenticate}
   * @see http://passportjs.org/
   *
   * @type {function|null}
   */
  static get authenticate(){
    this._checkInitialization();

    return this._data.authenticate;
  }

  /**
   * Sets the path that should be used by uploaded files through requests.
   * This information is used by {@link RequestHandler.uploadDirectory}
   *
   * @param {string} uploadPath - directory where the files should be uploaded to
   */
  static set uploadDirectory(uploadPath){
    assert(TypeCheck.isString(uploadPath), 'uploadPath needs to be defined as string');

    this._data.uploadDirectory = uploadPath;

    // creating the upload folder if it does not exist yet
    if (uploadPath !== null && !fs.existsSync(uploadPath)){

      /* istanbul ignore next */
      mkdirp.sync(uploadPath);
    }
  }

  /**
   * Returns the upload directory. This information is used by
   * {@link RequestHandler.uploadDirectory}
   *
   * @type {string} path - directory where the files should be uploaded to
   */
  static get uploadDirectory(){
    this._checkInitialization();

    return this._data.uploadDirectory;
  }

  /**
   * Sets the maximum upload size in bytes supported by requests.
   * This information is used by {@link RequestHandler.uploadMaxFileSize}
   *
   * @param {number} maxSize - file size in bytes
   */
  static set uploadMaxFileSize(maxSize){
    assert(TypeCheck.isNumber(maxSize), 'maxSize requires a numeric value');

    this._data.uploadMaxFileSize = maxSize;
  }

  /**
   * Returns the maximum upload size in bytes supported by requests.
   * This information is used by {@link RequestHandler.uploadMaxFileSize}
   * (default: `10 mb`)
   *
   * @type {number}
   */
  static get uploadMaxFileSize(){
    this._checkInitialization();

    return this._data.uploadMaxFileSize;
  }

  /**
  * Sets if the uploaded files should keep their original names, otherwise they
  * are renamed to random unique names. This information is used by
  * {@link RequestHandler.uploadPreserveFileName}
  *
  * @param {boolean} preserve - tells if the uploaded files should keep the
  * original name
   */
  static set uploadPreserveFileName(preserve){
    assert(TypeCheck.isBool(preserve), 'maxSize requires a numeric value');

    this._data.uploadPreserveFileName = preserve;
  }

  /**
   * Returns if the uploaded files should keep their original names, otherwise they
   * are renamed to random unique names. This information is used by
   * {@link RequestHandler.uploadPreserveFileName} (default: `true`)
   *
   * @type {boolean}
   */
  static get uploadPreserveFileName(){
    this._checkInitialization();

    return this._data.uploadPreserveFileName;
  }

  /**
   * Sets in bytes the size of the LRU cache available for the execution of actions.
   * This cache is defined by {@link Session.resultCache}
   *
   * @param {number} cacheSize - file size in bytes
   */
  static set lruCacheSize(cacheSize){
    assert(TypeCheck.isNumber(cacheSize), 'cacheSize requires a numeric value');

    this._data.lruCacheSize = cacheSize;
  }

  /**
   * Returns in bytes the size of the LRU cache. This information is used by
   * {@link Session.resultCache} (default: `20 mb`)
   *
   * @type {number}
   */
  static get lruCacheSize(){
    this._checkInitialization();

    return this._data.lruCacheSize;
  }

  /**
   * Sets in seconds the amount of time that an item under LRU cache should
   * be kept alive. This cache is defined by {@link Session.resultCache}
   *
   * @param {number} cacheLifespan - time in seconds
   */
  static set lruCacheLifespan(cacheLifespan){
    assert(TypeCheck.isNumber(cacheLifespan), 'cacheLifespan requires a numeric value');

    this._data.lruCacheLifespan = cacheLifespan;
  }

  /**
   * Returns in seconds the amount of time that an item under LRU cache should
   * be kept alive. This information is used by {@link Session.resultCache}
   * (default: `5 seconds`)
   *
   * @type {number}
   */
  static get lruCacheLifespan(){
    this._checkInitialization();

    return this._data.lruCacheLifespan;
  }

  /**
   * Auxiliary method used to check if a value form the settings can be queried.
   * In case the settings has not being initialized yet then it throws an exception
   *
   * @private
   */
  static _checkInitialization(){

    /* istanbul ignore if */
    if (!this._data.initialized){
      throw Error('Settings has not been initialized: Oca.initialize() or Settings.initialize()');
    }
  }

  static _data = {};
}

// exporting the module
module.exports = Settings;
