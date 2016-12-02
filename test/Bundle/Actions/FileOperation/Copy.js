const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
const Oca = require('../../../../src');

const FileOperation = Oca.Bundle.Actions.FileOperation;


describe('File Copy Action:', () => {

  const fooDir = tmp.dirSync().name;
  const someFilePath = path.join(fooDir, 'someFile.foo');
  const someTargetFolder = path.join(fooDir, 'A/B/C');
  const someTargetFilePath = path.join(someTargetFolder, 'targetFilePath.foo');

  before(() => {
    fs.writeFileSync(someFilePath, Array(1 * 1024).join('0'));
  });

  after(() => {
    fs.unlinkSync(someFilePath);
    fs.unlinkSync(someTargetFilePath);
    fs.rmdirSync(path.join(fooDir, 'A/B/C'));
    fs.rmdirSync(path.join(fooDir, 'A/B'));
    fs.rmdirSync(path.join(fooDir, 'A'));
  });

  it('If createTargetDirectories is set to false it should fail to copy a file to a nonexistent target folder', (done) => {

    (async () => {

      const copyAction = new FileOperation.Copy();
      copyAction.input('createTargetDirectories').value = false;
      copyAction.input('sourceFile').value = someFilePath;
      copyAction.input('targetFile').value = `${someTargetFilePath}__`;

      await copyAction.execute();

    })().then((result) => {
      done(new Error('Unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('Checking if the file has been copied', (done) => {

    (async () => {

      const copyAction = new FileOperation.Copy();
      copyAction.input('sourceFile').value = someFilePath;
      copyAction.input('targetFile').value = someTargetFilePath;

      await copyAction.execute();

      // in case the file copy has failed, the stats will throw an exception when
      // querying it from a file that does not exist
      fs.lstatSync(someTargetFilePath);

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });
});
