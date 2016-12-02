const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
const Oca = require('../../../../src');

const FileOperation = Oca.Bundle.Actions.FileOperation;


describe('File Move Action:', () => {

  const fooDir = tmp.dirSync().name;
  const someFilePath = path.join(fooDir, 'someFileA.foo');
  const someFilePathTarget = path.join(fooDir, 'someFileB.foo');

  before(() => {
    fs.writeFileSync(someFilePath, Array(1 * 1024).join('0'));
  });

  after(() => {
    fs.unlinkSync(someFilePathTarget);
  });

  it('Checking if the file has been moved', (done) => {

    (async () => {

      const moveAction = new FileOperation.Move();
      moveAction.input('sourceFile').value = someFilePath;
      moveAction.input('targetFile').value = someFilePathTarget;

      await moveAction.execute();

      fs.lstatSync(someFilePathTarget);

      return true;

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });
});
