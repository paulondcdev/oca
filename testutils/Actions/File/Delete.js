const promisify = require('es6-promisify');
const fs = require('fs');
const Oca = require('../../../src');

const Action = Oca.Action;

// promisifying
const unlink = promisify(fs.unlink);


/**
 * Deletes the input file
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type | Default Value
 * --- | :---: | --- | ---
 * file | ::on:: | {@link FilePath} | ::none::
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
   * @param {Object} data - plain object containing the value of the inputs
   * @return {Promise<boolean>} boolean telling if the
   * file has been delete
   * @protected
   */
  async _perform(data){

    await unlink(data.file);

    return true;
  }
}

// Registering action
Oca.registerAction(Delete, 'file.delete');

module.exports = Delete;
