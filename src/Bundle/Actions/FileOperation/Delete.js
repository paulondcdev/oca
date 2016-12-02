const promisify = require('es6-promisify');
const fs = require('fs');
const Action = require('../../../Action');

// promisifying
const unlink = promisify(fs.unlink);


/**
 * Deletes the input file
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type
 * --- | --- | ---
 * file | `true` | {@link FilePath}
 */
class Delete extends Action{

  /**
   * Creates the action
   */
  constructor(){
    super();
    this.createInput('file: filePath', {exists: true});
  }

  /**
   * Implements the execution of the action
   *
   * @return {Promise<boolean>} boolean telling if the
   * file has been delete
   * @protected
   */
  async _perform(){

    await unlink(this.input('file').value);

    return true;
  }
}

module.exports = Delete;
