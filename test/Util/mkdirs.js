const fs = require('fs');
const os = require('os');
const assert = require('assert');
const path = require('path');
const Oca = require('../../src');

const mkdirs = Oca.Util.mkdirs;


describe('mkdirs:', () => {

  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'UtilMkdirs'));
  const filePath = path.join(temporaryFolder, 'b1');
  const invalidPathLevelsA = path.join(temporaryFolder, 'b1', 'a', 'b');
  const pathLevelsA = path.join(temporaryFolder, 'a', 'b', 'c');
  const readOnlyPath = path.join(temporaryFolder, 'readOnly');

  before(() => {
    fs.writeFileSync(filePath, '0');
  });

  after(() => {
    fs.unlinkSync(filePath);
    fs.rmdirSync(pathLevelsA);
    fs.rmdirSync(path.join(temporaryFolder, 'a', 'b'));
    fs.rmdirSync(path.join(temporaryFolder, 'a'));
    fs.rmdirSync(readOnlyPath);
    fs.rmdirSync(temporaryFolder);
  });

  it('Should create the path levels (a/b/c) with the default permission (0777)', () => {

    return (async () => {
      await mkdirs(pathLevelsA);

      if (!fs.existsSync(pathLevelsA)){
        throw new Error(`Could not create path levels: ${pathLevelsA}`);
      }

      // checking the default permissions
      fs.accessSync(pathLevelsA, fs.W_OK);

    })();
  });

  it('Should create a folder with a different permission (0444)', () => {

    return (async () => {
      await mkdirs(readOnlyPath, 0o444);
      fs.accessSync(readOnlyPath, fs.R_OK);

      try{
        fs.accessSync(readOnlyPath, fs.W_OK);
      }
      catch(err){
        assert.equal(err.code, 'EACCES');
      }

    })();
  });

  it('Should not fail when the input path already exists', () => {
    return mkdirs(temporaryFolder);
  });

  it('Should fail to create the path levels when there is a file named and in the same location as the required directories', (done) => {

    (async () => {
      await mkdirs(invalidPathLevelsA);
    })().then((result) => {
      done(new Error('Unexpected result'));
    }).catch((err) => {
      done(err.code === 'ENOTDIR' ? null : err);
    });
  });
});
