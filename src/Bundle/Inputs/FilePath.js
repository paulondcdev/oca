const fs = require('fs');
const path = require('path');
const util = require('util');
const debug = require('debug')('Oca');
const ValidationError = require('../../ValidationError');
const Input = require('../../Input');
const BaseText = require('./BaseText');


/**
* File Path input
*
* ```javascript
* const input = Input.create('myInput: filePath');
* input.value = '/tmp/foo.txt';
* ```
*
* <h2>Property Summary</h2>
*
* Property Name | Description | Defined&nbsp;by Default | Default Value
* --- | --- | :---: | :---:
* restrictRequestAccess | boolean telling if the input should have restrict access \
* when handling requests. When enabled it only lets the input to be set by a file upload, \
* making sure that the input cannot be set otherwise (like through a string) | `true` | `true`
* maxFileSize | maximum file size in bytes (not defined by default) | false |
* exists | checks if the file path exists | false |
* allowedExtensions | specific list of extensions allowed by the input \
* (this check is case insensitive), example: ['jpg', 'png'] | false |
*/
class FilePath extends BaseText{

  /**
   * Creates the FilePath Input
   *
   */
  constructor(...args){
    super(...args);

    if (!this.hasProperty('restrictRequestAccess')){
      this.assignProperty('restrictRequestAccess', true);
    }
  }

  /**
  * Returns either the extension of the file path or an empty string in case the
  * file path does not have an extension
  *
  * @param {number} [at] - index used when the input is defined as vector to
  * tell which value should be used
  * @return {string}
  *
  * ```javascript
  * let myInput = Input.createInput('myInput: filePath');
  * myInput.value = '/tmp/file.jpg';
  * console.log(myInput.extension());
  * 'jpg'
  * ```
  */
  extension(at=null){

    let result = '';

    if (!this.isEmpty){
      const value = this._valueAt(at);
      const ext = path.extname(value);

      if (ext.length > 1){
        result = ext.slice(1);
      }
    }

    return result;
  }

  /**
  * Returns the basename of the file path
  *
  * @param {number} [at] - index used when the input is defined as vector to
  * tell which value should be used
  * @return {string}
  *
  * ```javascript
  * const myInput = Input.createInput('myInput: filePath');
  * myInput.value = '/tmp/file.jpg';
  * console.log(myInput.basename());
  * 'file.jpg'
  * ```
  */
  basename(at=null){
    return path.basename(this._valueAt(at));
  }

  /**
  * Returns the dirname of the file path
  *
  * @param {number} [at] - index used when the input is defined as vector to
  * tell which value should be used
  * @return {string}
  *
  * ```javascript
  * let myInput = Input.createInput('myInput: filePath');
  * myInput.value = '/tmp/file.jpg';
  * console.log(myInput.dirname());
  * '/tmp'
  * ```
  */
  dirname(at=null){
    return path.dirname(this._valueAt(at));
  }

  /**
  * Returns the file stats
  *
  * @param {number} [at] - index used when the input is defined as vector to
  * tell which value should be used
  * @return {Promise<Object>}
  */
  stat(at=null){

    return new Promise((resolve, reject) => {

      if (!this._isCached('stats', at)){
        const value = this._valueAt(at);

        fs.stat(value, (err, stats) => {
          this._setToCache('stats', [err, stats], at);

          if (err){
            reject(err);
          }
          else{
            resolve(stats);
          }
        });
      }
      else{
        const stats = this._getFromCache('stats', at);
        if (stats[0]){
          reject(stats[0]);
        }
        else{
          resolve(stats[1]);
        }
      }
    });
  }

  /**
   * Implements the file path validations
   *
   * @param {number} [at] - index used when the input is defined as vector to
   * tell which value should be used
   * @return {*} value held by the input based on the current context (at)
   * @protected
   */
  async _validation(at=null){

    // calling super class validations
    // todo: babel does not support 'await' calling a method under 'super'
    // https://github.com/babel/babel/issues/3930
    // const value = await super._validation(at);
    const value = await BaseText.prototype._validation.call(this, at);

    // only specific extensions
    if (this.property('allowedExtensions') && !this.property('allowedExtensions').map(x => x.toLowerCase()).includes(this.extension(at).toLowerCase())){
      throw new ValidationError(util.format("Extension '%s' is not supported! (supported extensions: %s)", this.extension(at), this.property('allowedExtensions')), FilePath.errorCodes[0]);
    }

    // file exists & max size
    if (this.property('exists') || this.property('maxFileSize')){

      let stats = null;
      let err = null;
      try{
        stats = await this.stat(at);
      }
      catch(errr){
        err = errr;
        debug(err);
      }

      if (this.property('exists') && err && err.code === 'ENOENT'){
        err = new ValidationError('File does not exist', FilePath.errorCodes[1]);

      }
      else if (stats !== null && this.property('maxFileSize') && stats.size > this.property('maxFileSize')){
        err = new ValidationError(util.format('File size (%.1f mb) exceeds the limit allowed (%.1f mb)', stats.size/1024/1024, this.property('maxFileSize')/1024/1024), FilePath.errorCodes[2]);
      }

      if (err){
        throw (err);
      }
    }

    return value;
  }

  static errorCodes = [
    '05139388-f4ec-4496-be20-f794eb14d1ff',
    'dedf89bc-c57a-4ce7-ab84-f84f49144230',
    '99c3aeff-241b-4120-a708-d2e1ca1a1dce',
  ];
}

// registering the input
Input.registerInput(FilePath);

module.exports = FilePath;
