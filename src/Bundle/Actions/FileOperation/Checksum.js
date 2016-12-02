const fs = require('fs');
const crypto = require('crypto');
const Action = require('../../../Action');


/**
 * Returns a checksum for the input file
 *
 * <h2>Input Summary</h2>
 *
 * Name | Required | Type
 * --- | --- | ---
 * file | `true` | {@link FilePath}
 * algo | `false` | {@link Text}
 */
class Checksum extends Action{

  /**
   * Creates the action
   */
  constructor(){
    super();

    this.createInput('file: filePath', {exists: true});

    // hash algorithms supported by node.js
    this.createInput('algo: text', {defaultValue: 'sha256'});
  }

  /**
   * Implements the execution of the action
   *
   * @return {Promise<string>} string containing the checksum
   * @protected
   */
  _perform(){

    return new Promise((resolve, reject) => {

      const hash = crypto.createHash(this.input('algo').value);
      const stream = fs.ReadStream(this.input('file').value);

      stream.on('data', (d) => {
        hash.update(d);
      });

      stream.on('error', (err) => {
        reject(err);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
    });
  }
}

module.exports = Checksum;
