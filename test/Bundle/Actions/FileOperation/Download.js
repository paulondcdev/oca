const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
const assert = require('assert');
const express = require('express'); // eslint-disable-line
const debug = require('debug')('Oca');
const Oca = require('../../../../src');

const FileOperation = Oca.Bundle.Actions.FileOperation;


describe('File Download Action:', () => {

  // initializing oca
  Oca.initialize();

  let server = null;
  let port = null;
  const fooDir = tmp.dirSync().name;
  const someFile = 'someFile.foo';
  const someFileWithoutExt = 'someFile';

  before((done) => {

    // creating temporary files that will be used by the tests bellow (they get
    // removed automatically by the tmp library)
    fs.writeFileSync(path.join(fooDir, someFile), Array(1 * 1024).join('0'));
    fs.writeFileSync(path.join(fooDir, someFileWithoutExt), Array(1).join('0'));

    const app = express();
    app.use('/', express.static(fooDir));

    server = app.listen(0, () => {
      done();
    });

    port = server.address().port;
  });

  after(() => {
    fs.unlinkSync(path.join(fooDir, someFile));
    fs.unlinkSync(path.join(fooDir, someFileWithoutExt));

    if (server){
      server.close();
    }
  });

  it('If createTargetDirectories is set to false it should fail to download the URL to a nonexistent target folder', (done) => {

    (async () => {

      const downloadAction = new FileOperation.Download();
      downloadAction.input('createTargetDirectories').value = false;
      downloadAction.input('inputUrl').value = `http://localhost:${port}/${someFile}`;
      downloadAction.input('targetFolder').value = path.join(fooDir, '/invalidSubDir');

      await downloadAction.execute();

    })().then((result) => {
      done(new Error('Unexpected value'));
    }).catch((err) => {
      debug(err);
      done();
    });
  });

  it('Should download a file from an url creating the target folders', (done) => {

    (async () => {

      const downloadAction = new FileOperation.Download();
      downloadAction.input('inputUrl').value = `http://localhost:${port}/${someFile}`;
      downloadAction.input('targetFolder').value = path.join(fooDir, 'folder');
      const downloadedFile = await downloadAction.execute();

      assert.equal(path.extname(downloadedFile), '.foo');

      const checksumAction = new FileOperation.Checksum();
      checksumAction.input('file').value = downloadedFile;

      const result = await checksumAction.execute();

      // no more need for this file
      fs.unlinkSync(downloadedFile);
      fs.rmdirSync(downloadAction.input('targetFolder').value);

      assert.equal('8f017d33568c8bad2c714c86c4418a1d21c7ce5a88f7f37622d423da5ada524e', result);

      return result;

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should download a file from an url without extension', (done) => {

    (async () => {

      const downloadAction = new FileOperation.Download();
      downloadAction.input('inputUrl').value = `http://localhost:${port}/${someFileWithoutExt}`;
      downloadAction.input('targetFolder').value = path.join(fooDir, 'folder');
      const downloadedFile = await downloadAction.execute();

      assert.equal(path.extname(downloadedFile), '');

      const checksumAction = new FileOperation.Checksum();
      checksumAction.input('file').value = downloadedFile;

      const result = await checksumAction.execute();

      // no more need for this file
      fs.unlinkSync(downloadedFile);
      fs.rmdirSync(downloadAction.input('targetFolder').value);

      assert.equal('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', result);

      return result;

    })().then((result) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Trying to download an invalid url', (done) => {

    (async () => {

      const downloadAction = new FileOperation.Download();
      downloadAction.input('inputUrl').value = `http://localhost:${port}/${someFile}_Invalid`;
      downloadAction.input('targetFolder').value = fooDir;
      await downloadAction.execute();

    })().then((result) => {
      done(new Error('Unexpected result'));
    }).catch((err) => {
      done();
    });
  });
});
