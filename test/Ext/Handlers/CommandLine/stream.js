const assert = require('assert');
const path = require('path');
const stream = require('stream');
const crypto = require('crypto');
const Oca = require('../../../../src');
const testutils = require('../../../../testutils');

const Settings = Oca.Settings;


describe('CommandLine Stream:', () => {

  class WriteStream extends stream.Writable{
    constructor(){
      super();
      this.data = [];
    }

    _write(chunk, enc, next){
      this.data.push(chunk);
      next();
    }
  }

  const testDataImagePath = path.join(__dirname, '../../../data/image.png');

  // action shared by the tests
  beforeEach(() => {
    Settings.set('handler/commandLine/stdout', new WriteStream());
    Settings.set('handler/commandLine/stderr', new WriteStream());
  });

  afterEach(() => {
    Settings.set('handler/commandLine/stdout', process.stdout);
    Settings.set('handler/commandLine/stderr', process.stderr);
  });

  it('Should output a stream', () => {

    const commandLine = Oca.createHandler('commandLine');
    commandLine.args = [
      'node',
      'file',
      '--type',
      'binary',
      '--file',
      testDataImagePath,
    ];

    return (async () => {

      const action = new testutils.Actions.Shared.StreamOutput();
      await commandLine.loadToAction(action);
      commandLine.output(await action.execute());

      // querying the checksum from the test image file
      const checksumAction = Oca.createAction('file.checksum');
      checksumAction.input('file').value = testDataImagePath;
      const testImageFileChecksum = await checksumAction.execute();

      const streamChecksum = crypto.createHash('sha256').update(Buffer.concat(Settings.get('handler/commandLine/stdout').data)).digest('hex');
      assert.equal(testImageFileChecksum, streamChecksum);
    })();
  });
});
