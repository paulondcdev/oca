const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const promisify = require('es6-promisify');
const uuid = require('uuid');
const mkdirpModule = require('mkdirp');
const Action = require('../../../Action');
const Settings = require('../../../Settings');

// promisifying
const stat = promisify(fs.stat);
const mkdirp = promisify(mkdirpModule);


/**
 * Downloads the input url to the target file path
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type
 * --- | --- | ---
 * inputUrl | `true` | {@link Url}
 * targetFolder | `false` | {@link FilePath}
 */
class Download extends Action{

  /**
   * Creates the action
   */
  constructor(){
    super();

    this.createInput('inputUrl: url');
    this.createInput('targetFolder: filePath', {defaultValue: Settings.uploadDirectory});
    this.createInput('createTargetDirectories: bool', {defaultValue: true});
  }

  /**
   * Implements the execution of the action
   *
   * @return {Promise<string>} string containing the path of the download file
   * @protected
   */
  async _perform(){

    const targetFolder = this.input('targetFolder').value;
    let targetFullFileName = path.join(targetFolder, uuid.v4());

    // creating sub-folders
    if (this.input('createTargetDirectories').value){
      try{
        await stat(targetFolder);
      }
      catch(err){
        await mkdirp(targetFolder);
      }
    }

    // extension
    if (this.input('inputUrl').extension()){
      targetFullFileName += `.${this.input('inputUrl').extension()}`;
    }

    try{
      await this._run(targetFullFileName);
    }
    catch(err){
      // deletes any residual file async (it does not need to await for the result)
      fs.unlink(targetFullFileName);

      throw err;
    }

    return targetFullFileName;
  }

  /**
   * Auxiliary method that performs the download
   *
   * @param {string} targetFullFileName - file path used to store the downloaded file
   * @return {Promise}
   */
  _run(targetFullFileName){

    return new Promise((resolve, reject) => {
      const s = fs.createWriteStream(targetFullFileName);

      s.on('error', (err) => {
        reject(err);
      });

      /* istanbul ignore next */
      const httpModule = (this.input('inputUrl').protocol() === 'http:') ? http : https;

      httpModule.get(this.input('inputUrl').value, (response) => {
        response.pipe(s);

        s.on('finish', () => {

          // close() is async, the callback is called after close completes.
          s.close(() => {
            resolve(targetFullFileName);
          });
        });

      }).on('error', (err) => {
        /* istanbul ignore next */
        reject(err);
      });
    });
  }
}

module.exports = Download;
