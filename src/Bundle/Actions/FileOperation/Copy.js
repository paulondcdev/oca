const fs = require('fs');
const mkdirpModule = require('mkdirp');
const promisify = require('es6-promisify');
const Action = require('../../../Action');

// promisifying
const stat = promisify(fs.stat);
const mkdirp = promisify(mkdirpModule);


/**
 * Copy the input file to the target file path
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type
 * --- | --- | ---
 * sourceFile | `true` | {@link FilePath}
 * targetFile | `true` | {@link FilePath}
 * createTargetDirectories | `false` | {@link Bool}
 */
class Copy extends Action{

  /**
   * Creates the action
   */
  constructor(){
    super();

    this.createInput('sourceFile: filePath', {exists: true});
    this.createInput('targetFile: filePath');
    this.createInput('createTargetDirectories: bool', {defaultValue: true});
  }

  /**
   * Implements the execution of the action
   *
   * @return {Promise<boolean>} boolean telling if the
   * file has been copied
   * @protected
   */
  async _perform(){

    const targetFolder = this.input('targetFile').dirname();

    // creating sub-folders
    if (this.input('createTargetDirectories').value){
      try{
        await stat(targetFolder);
      }
      catch(err){
        await mkdirp(targetFolder);
      }
    }

    // doing the file copy
    await this._fsCopy();

    return true;
  }

  /**
   * Auxiliary method that performs the file copy
   *
   * @return {Promise<boolean>} boolean telling if the value has been copied
   * @private
   */
  _fsCopy(){

    return new Promise((resolve, reject) => {

      const rd = fs.createReadStream(this.input('sourceFile').value);

      /* istanbul ignore next */
      rd.on('error', (err) => {
        reject(err);
      });

      const wr = fs.createWriteStream(this.input('targetFile').value);

      wr.on('error', (err) => {
        reject(err);
      });

      wr.on('close', (ex) => {
        resolve(true);
      });

      rd.pipe(wr);
    });
  }
}

module.exports = Copy;
