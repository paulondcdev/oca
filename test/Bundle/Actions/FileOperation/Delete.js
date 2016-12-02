const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
const Oca = require('../../../../src');

const FileOperation = Oca.Bundle.Actions.FileOperation;


describe('File Delete Action:', () => {

  const fooDir = tmp.dirSync().name;
  const someFilePath = path.join(fooDir, 'someFile.foo');

  before(() => {
    fs.writeFileSync(someFilePath, Array(1 * 1024).join('0'));
  });

  it('Checking if the file has been deleted', (done) => {

    (async () => {

      const deleteAction = new FileOperation.Delete();
      deleteAction.input('file').value = someFilePath;

      await deleteAction.execute();

      // in case the file delete has worked, the stats will throw an exception when
      // querying it from a file that does not exist
      try{
        fs.lstatSync(someFilePath);
      }
      catch(err){
        return true;
      }

      return false;

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });
});
