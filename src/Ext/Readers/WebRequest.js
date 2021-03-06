const os = require('os');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const promisify = require('es6-promisify');
const TypeCheck = require('js-typecheck');
const Settings = require('../../Settings');
const Handler = require('../../Handler');
const Reader = require('../../Reader');
const Util = require('../../Util');

// promisifying
const mkdtemp = promisify(fs.mkdtemp);
const rename = promisify(fs.rename);
const stat = promisify(fs.stat);

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _temporaryFolders = Symbol('temporaryFolders');
const _request = Symbol('request');


/**
 * Web request reader.
 *
 * This reader is used by the {@link Web} handler to query values from a request.
 *
 * This reader supports all serializable inputs. It deals with file uploads
 * automatically; therefore any {@link FilePath} input becomes a potential
 * upload field. When that is the case the input gets assigned with the file path
 * about where the file has been uploaded to. By default it tries to keep the original
 * uploaded file name by replacing any illegal character with underscore, however you can
 * control this behavior via `uploadPreserveFileName` (if disabled each uploaded file
 * gets named with an unique name).
 *
 * This reader works by looking for the input names in the request, for instance:
 *
 * `http://.../?myInput=10&myOtherInput=20`
 *
 * ```
 * class MyAction extends Oca.Action {
 *   constructor(){
 *     super();
 *     this.createInput('myInput: numeric');
 *     this.createInput('myOtherInput: numeric');
 *   }
 * }
 * ```
 *
 * When a value is found for the input, it gets loaded via {@link Input.parseValue}
 * where each input implementation has its own way of parsing the serialized data,
 * to find out about how a value is serialized for an specific input type you could simply
 * set an arbitrary value to the input you are interested then query it back through
 * {@link Input.serializeValue}. Also, Oca provides a reference datasheet
 * about the serialization forms for the inputs bundled with it, found at {@link Reader}.
 *
 * **Route parameters:**
 * If an webfied action contains route parameters defined (`/users/:userId/books/:bookId`)
 * this reader is going to try to find them under the action input names.
 * Therefore when a route parameter matches to the name of an input then the value of
 * the parameter is loaded to the input.
 *
 * **Vector Inputs:**
 * Supported conventions for array parameters:
 *
 * - *Serialized vector value (JSON Style)*
 * ```
 * http://.../?vectorInput=["a", "b", "c"]
 * ```
 *
 * - *Repeated param names*
 * ```
 * http://.../?vectorInput[]=a&vectorInput[]=b&vectorInput[]=c
 * ```
 * *or*
 * ```
 * http://.../?vectorInput=a&vectorInput=b&vectorInput=c
 * ```
 *
 * <h2>Options Summary</h2>
 *
 * Option Name | Description
 * --- | ---
 * uploadDirectory | directory used for placing file uploads in, default value\
 * (`TMP_DIR/upload`) driven by:\
 * <br>`Settings.get('reader/webRequest/uploadDirectory')`
 * uploadPreserveFileName | enabled by default it tries to keep the original final name of \
 * uploads, any illegal character is replaced by underscore, otherwise if disabled \
 * it gives a random name to the upload, default value driven by: \
 * <br>`Settings.get('reader/webRequest/uploadPreserveFileName')`
 * uploadMaxFileSize | total maximum file size about all uploads in bytes, \
 * default value (`4 mb`) driven by: \
 * <br>`Settings.get('reader/webRequest/uploadMaxFileSize')`
 * maxFields | Limits the number of fields that the querystring parser will decode, \
 * default value (`1000`) driven by: \
 * <br>`Settings.get('reader/webRequest/maxFields')`
 * maxFieldsSize | Limits the amount of memory all fields together (except files) can\
 * allocate in bytes, default value (`2 mb`) driven by:\
 * <br>`Settings.get('reader/webRequest/maxFieldsSize')` [`2 mb`]
 *
 * <br/>Example about defining a custom `uploadMaxFileSize` option from inside of an
 * action through the metadata support:
 *
 * ```
 * class MyAction extends Oca.Action{
 *    constructor(){
 *      super();
 *
 *      // 'uploadMaxFileSize' option
 *      this.setMetadata('handler.web.readOptions', {
 *        uploadMaxFileSize: 10 * 1024 * 1024,
 *      });
 *    }
 * }
 * ```
 */
class WebRequest extends Reader{

  /**
   * Creates a web request
   *
   * @param {Action} action - action that should be used by the reader
   * @param {Object} request - request object created by express-js
   */
  constructor(action){
    super(action);

    this[_request] = null;

    // default options
    this.setOption('uploadDirectory', Settings.get('reader/webRequest/uploadDirectory'));
    this.setOption('uploadPreserveFileName', Settings.get('reader/webRequest/uploadPreserveFileName'));
    this.setOption('uploadMaxFileSize', Settings.get('reader/webRequest/uploadMaxFileSize'));
    this.setOption('maxFields', Settings.get('reader/webRequest/maxFields'));
    this.setOption('maxFieldsSize', Settings.get('reader/webRequest/maxFieldsSize'));

    this[_temporaryFolders] = [];
  }

  /**
   * Sets the request object created by express
   *
   * @param {Object} value - req object
   * @see http://expressjs.com/en/api.html#req
   */
  setRequest(value){
    this[_request] = value;
  }

  /**
   * Returns the request object created by express
   *
   * @return {Object}
   * @see http://expressjs.com/en/api.html#req
   */
  request(){
    return this[_request];
  }

  /**
   * Implements the web request reader
   *
   * @param {Array<Input>} inputList - Valid list of inputs that should be used for
   * the parsing
   * @return {Promise<Object>}
   * @protected
   */
  async _perform(inputList){
    const result = Object.create(null);
    const request = this.request();

    // handling body fields
    let bodyFields = null;
    if (['POST', 'PUT', 'PATCH'].includes(request.method)){
      bodyFields = await this._bodyFields(inputList);
    }

    // setting the action inputs based on the request parameters
    for (const input of inputList){
      const inputName = input.name();

      // value set by the request
      let requestInputValue;
      const restrictWebAccess = input.hasProperty('restrictWebAccess') ? input.property('restrictWebAccess') : false;

      // mapping param to input names
      if (!restrictWebAccess && inputName in request.params){
        requestInputValue = request.params[inputName];
      }
      // body fields
      else if (bodyFields !== null){
        if (restrictWebAccess && inputName in bodyFields.files){
          requestInputValue = bodyFields.files[inputName];
        }
        else if (!restrictWebAccess){

          if (inputName in bodyFields.files){
            requestInputValue = bodyFields.files[inputName];
          }
          else if (inputName in bodyFields.fields){
            requestInputValue = bodyFields.fields[inputName];
          }
        }
      }

      // GET, DELETE ...
      else if (!restrictWebAccess && inputName in request.query){
        requestInputValue = request.query[inputName];
      }

      if (requestInputValue !== undefined){
        result[inputName] = requestInputValue;
      }
    }

    return result;
  }

  /**
   * Returns an object containing the processed body fields parsed, this object separates
   * the fields from the files
   *
   * @return {Promise<Object>}
   * @private
   */
  async _bodyFields(){

    // making sure the upload directory exists
    const uploadDirectory = this.option('uploadDirectory');
    if (uploadDirectory && !WebRequest._checkedUploadDirectories.includes(uploadDirectory)){

      // in case the stat fails it will try to recreate the folders
      let needsToCreate = false;
      try{
        await stat(uploadDirectory);
      }
      // otherwise tries to create it
      catch(err){

        // file not found
        if (err.code === 'ENOENT'){
          needsToCreate = true;
        }
        else{
          /* istanbul ignore next */
          throw err;
        }
      }

      if (needsToCreate){
        await Util.mkdirs(uploadDirectory);
      }

      WebRequest._checkedUploadDirectories.push(uploadDirectory);
    }

    // parsing the body fields
    const bodyFields = await this._parseForm();

    // normalizing multiple values for the fields
    this._normalizeFieldMultipleValues(bodyFields);

    // handling the uploaded files
    await this._handleUploadedFiles(bodyFields);

    return bodyFields;
  }

  /**
   * Normalizing multiple values for the fields by adding the values to an array
   * followed by the name of the field (field=[value1, value2...]) rather than
   * having an individual field entry for each of the indexes of the array
   * (field[0]=value1, field[1]=value2...)
   *
   * @param {Object} bodyFields - parsed body object
   * @private
   */
  _normalizeFieldMultipleValues(bodyFields){

    const multipleValueFields = Object.create(null);

    for (const inputName in bodyFields.fields){

      // checking if there is any array field if so extracting their name and value
      if (inputName.endsWith(']')){
        const inputParts = inputName.split('[');
        if (inputParts.length === 2){
          if (!(inputParts[0] in multipleValueFields)){
            multipleValueFields[inputParts[0]] = [];
          }

          multipleValueFields[inputParts[0]].push(bodyFields.fields[inputName]);
        }
      }
    }

    // merging the normalized multiple values to the original fields
    Object.assign(bodyFields.fields, multipleValueFields);
  }

  /**
   * Handles the uploaded files (changes bodyFields in-place)
   *
   * @param {Object} bodyFields - parsed body object
   * @private
   */
  async _handleUploadedFiles(bodyFields){
    const keepOrignalNamePromises = new Map();

    const preserveFileName = this.option('uploadPreserveFileName');
    for (const inputName in bodyFields.files){
      // multiple files
      if (TypeCheck.isList(bodyFields.files[inputName])){

        for (const index in bodyFields.files[inputName]){
          if (preserveFileName){
            keepOrignalNamePromises.set([inputName, index], this._keepOriginalUploadName(bodyFields.files[inputName][index]));
          }
          else{
            bodyFields.files[inputName][index] = bodyFields.files[inputName][index].path;
          }
        }
      }

      // single file
      else{
        if (preserveFileName){
          keepOrignalNamePromises.set([inputName], this._keepOriginalUploadName(bodyFields.files[inputName]));
        }
        else{
          bodyFields.files[inputName] = bodyFields.files[inputName].path;
        }
      }
    }

    // 'keep original name' is done in parallel for all files at once
    if (keepOrignalNamePromises.size){
      const originalNameKeys = Array.from(keepOrignalNamePromises.keys());
      const originalNameValues = await Promise.all(keepOrignalNamePromises.values());

      for (let i=0, len=keepOrignalNamePromises.size; i < len; ++i){
        // single
        if (originalNameKeys[i].length === 1){
          bodyFields.files[originalNameKeys[i][0]] = originalNameValues[i];
        }
        // multi
        else{
          bodyFields.files[originalNameKeys[i][0]][originalNameKeys[i][1]] = originalNameValues[i];
        }
      }
    }

    // adding the cleanup temporary folders to the wrapup tasks
    if (this[_temporaryFolders].length){
      this.action().session().wrapup().addWrappedPromise(this._cleanupTemporaryFolders.bind(this));
    }
  }

  /**
   * Auxiliary method used to promisify formidable's form.parse call
   *
   * @return {Promise<Object>}
   * @private
   */
  _parseForm(){
    return new Promise((resolve, reject) => {

      const form = new formidable.IncomingForm();

      // formidable settings
      form.uploadDir = this.option('uploadDirectory');
      form.maxFileSize = this.option('uploadMaxFileSize');
      form.keepExtensions = true;
      form.multiples = true;
      form.encoding = 'utf-8';
      form.maxFields = this.option('maxFields');
      form.maxFieldsSize = this.option('maxFieldsSize');

      form.parse(this.request(), (err, formFields, formFiles) => {

        // in case of any error
        /* istanbul ignore next */
        if (err){
          err.status = err.status || 500;
          reject(err);
          return;
        }

        const result = Object.create(null);
        result.files = formFiles;
        result.fields = formFields;

        resolve(result);
      });
    });
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
    const uploadFolder = await mkdtemp(path.join(this.option('uploadDirectory'), 'file-'));
    const finalName = path.join(uploadFolder, uploadFile.name.replace(/[^a-zA-Z0-9 _.-]/g, '_'));
    await rename(uploadFile.path, finalName);

    // temporary folders removed at the end of the request
    this[_temporaryFolders].push(uploadFolder);

    return finalName;
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

        // theoretically this method can be called multiple times by handler.execute
        // for the same request
        delete this[_temporaryFolders][folder];

        /* istanbul ignore next */
        if (err){
          console.error(`Couldn't remove directory: ${folder}`); // eslint-disable-line no-console
        }
      });
    }
  }

  static _checkedUploadDirectories = [];
}

// default settings
Settings.set('reader/webRequest/uploadDirectory', path.join(os.tmpdir(), 'upload'));
Settings.set('reader/webRequest/uploadMaxFileSize', 4 * 1024 * 1024);
Settings.set('reader/webRequest/uploadPreserveFileName', true);
Settings.set('reader/webRequest/maxFields', 1000);
Settings.set('reader/webRequest/maxFieldsSize', 2 * 1024 * 1024);

// registering reader
Handler.registerReader(WebRequest, 'web');

module.exports = WebRequest;
