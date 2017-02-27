const fs = require('fs');
const os = require('os');
const path = require('path');
const Oca = require('../../../../src');


describe('Delete Action:', () => {

  const temporaryFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'deleteActionTest'));
  const filePath = path.join(temporaryFolder, 'file.foo');

  before(() => {
    fs.writeFileSync(filePath, Array(1 * 1024).join('0'));
  });

  after(() => {
    fs.rmdirSync(temporaryFolder);
  });

  it('Checking if the file has been deleted', () => {

    return (async () => {

      const deleteAction = Oca.createAction('file.delete');
      deleteAction.input('file').value = filePath;

      await deleteAction.execute();

      // in case the file delete has worked, the stats will throw an exception when
      // querying it from a file that does not exist
      try{
        fs.lstatSync(filePath);
      }
      catch(err){
        return true;
      }

      return false;

    })();
  });
});
