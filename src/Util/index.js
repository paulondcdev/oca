const fs = require('fs');
const debug = require('debug')('Oca');
const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const promisify = require('es6-promisify');

// promisifying
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

// optional dependency (requires node-gyp)
let xxhash = null;
try{
  xxhash = require('xxhash'); // eslint-disable-line
}
catch(err){
  /* istanbul ignore next */
  debug('xxHash not available');
}


/**
 * Returns a non-cryptographic hash for the buffer. By default it tries to
 * use xxHash if not available (node-gyp) then it uses SHA256.
 *
 * @param {Buffer} value - buffer value that should be used to generate the hash
 * @param {Object} options - custom options
 * @param {boolean} [options.forceFallback=false] - when enabled forces to use the
 * fallback hash
 * @param {number} [options.seed=0xA] - seed used by the xxHash
 * @return {string}
 */
module.exports.hash = (value, {forceFallback=false, seed=0xA}={}) => {
  assert(value instanceof Buffer, 'Invalid buffer instance');

  let result;

  // whenever possible lets use xxHash
  if (!forceFallback && xxhash){
    result = xxhash.XXHash64.hash(value, seed).toString('hex');
  }
  // otherwise fallback to sha256
  else{
    result = crypto.createHash('sha256').update(value).digest('hex');
  }

  return result;
};

/**
 * Creates folders recursively, in case a level already exist then it is skipped
 *
 * @param {string} fullPath - path that should be created
 * @param {number} [mode] - optional octal value about the permission mode for the created
 * folders
 */
module.exports.mkdirs = async (fullPath, mode=0o777) => {
  let needsToCreate = false;
  // in case the stat fails it will try to recreate the folders
  try{
    await stat(fullPath);
  }
  // otherwise tries to create it
  catch(err){

    // not found
    if (err.code === 'ENOENT'){
      needsToCreate = true;
    }
    else{
      throw err;
    }
  }

  // going through all levels and creating them if necessary
  if (needsToCreate){
    const pathLevels = path.normalize(fullPath).split(path.sep);
    const currentLevels = [];

    for (const level of pathLevels){
      if (level === '' && currentLevels.length === 0){
        currentLevels.push(path.sep);
      }
      else if (level !== ''){
        currentLevels.push(level);
        const currentPath = currentLevels.join(path.sep);

        let needsToCreateCurrentLevel = false;
        try{
          await stat(currentPath); // eslint-disable-line no-await-in-loop
        }
        catch(err){
          // not found
          if (err.code === 'ENOENT'){
            needsToCreateCurrentLevel = true;
          }
          else{
            /* istanbul ignore next */
            throw err;
          }
        }

        if (needsToCreateCurrentLevel){
          await mkdir(currentPath, mode); // eslint-disable-line no-await-in-loop
        }
      }
    }
  }
};

module.exports.ImmutableMap = require('./ImmutableMap');
module.exports.LruCache = require('./LruCache');
