const fs = require('fs');
const promisify = require('es6-promisify');
const Action = require('../../../Action');

// promisifying
const rename = promisify(fs.rename);


/**
 * Moves the input file
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type
 * --- | --- | ---
 * sourceFile | `true` | {@link FilePath}
 * targetFile | `true` | {@link FilePath}
 */
class Move extends Action{

  /**
   * Creates the action
   */
  constructor(){
    super();

    this.createInput('sourceFile: filePath', {exists: true});
    this.createInput('targetFile: filePath');
  }

  /**
   * Implements the execution of the action
   *
   * @return {Promise<boolean>} boolean telling if the
   * file has been moved
   * @protected
   */
  async _perform(){

    await rename(this.input('sourceFile').value, this.input('targetFile').value);

    return true;
  }
}

module.exports = Move;
