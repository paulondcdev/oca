const fs = require('fs');
const tmp = require('tmp');
const assert = require('assert');
const minimatch = require('minimatch'); // eslint-disable-line
const Oca = require('../../../src');

const Input = Oca.Input;


describe('FilePath Input:', () => {

  // creating temporary files that will be used by the tests bellow
  const largeFilePath = tmp.fileSync().name;
  const smallFilePath = tmp.fileSync().name;
  const setupFromTestA = tmp.fileSync().name;
  const setupFromTestB = tmp.fileSync().name;
  const setupFromTestC = tmp.fileSync().name;
  const setupFromTestD = tmp.fileSync().name;

  before(() => {
    fs.writeFileSync(largeFilePath, Array(10 * 1024 * 1024).join('0'));
    fs.writeFileSync(smallFilePath, Array(1 * 1024 * 1024).join('0'));
    fs.writeFileSync(setupFromTestA, Array(1 * 1024 * 1024).join('0'));
    fs.writeFileSync(setupFromTestB, Array(1 * 1024 * 1024).join('0'));
    fs.writeFileSync(setupFromTestC, Array(1 * 1024 * 1024).join('0'));
    fs.writeFileSync(setupFromTestD, Array(1 * 1024 * 1024).join('0'));
  });

  after(() => {
    fs.unlinkSync(largeFilePath);
    fs.unlinkSync(smallFilePath);
  });

  it('Input should start empty', () => {
    const input = Input.create('input: filePath');
    assert.equal(input.value, null);
  });

  it('restrictRequestAccess should be enabled by default', () => {
    const input = Input.create('input: filePath');
    assert(input.property('restrictRequestAccess'));
  });

  it('Should fail when file does not exist', (done) => {

    (async () => {

      const input = Input.create('input: filePath', {exists: true});
      input.value = 'invalid file path';
      await input.validate();

    })().then((result) => {
      done(new Error('unexpected value'));

    }).catch((err) => {
      done(null);
    });
  });

  it("Should not fail if a file does not exist and the property 'exists' is not in place", (done) => {

    (async () => {

      const input = Input.create('input: filePath', {exists: false});
      input.value = 'invalid file path';
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should work with vector file paths', (done) => {

    (async () => {

      const input = Input.create('input: filePath[]', {exists: true});
      input.value = [largeFilePath, largeFilePath];
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should test if the cache copied through setupFrom is working on the target', (done) => {

    (async () => {

      const input = Input.create('input: filePath[]', {exists: true});
      input.value = [setupFromTestA, setupFromTestB];
      await input.validate();

      // removing the files
      fs.unlinkSync(setupFromTestA);
      fs.unlinkSync(setupFromTestB);

      const inputB = Input.create('input: filePath[]', {exists: true});
      inputB.setupFrom(input);
      await input.validate();

      assert.equal(inputB.value.length, 2);

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should test if the cache copied at a specific index (at) through setupFrom is working on the target', (done) => {

    (async () => {

      const input = Input.create('input: filePath[]', {exists: true});
      input.value = [setupFromTestC, setupFromTestD];
      await input.validate();

      // removing the files
      fs.unlinkSync(setupFromTestC);
      fs.unlinkSync(setupFromTestD);

      const inputB = Input.create('input: filePath', {exists: true});
      inputB.setupFrom(input, 1);
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should fail in setupFrom to set a vector input based on in a scalar input', (done) => {

    const inputA = Input.create('input: filePath[]');
    const inputB = Input.create('input: filePath');

    try{
      inputA.setupFrom(inputB);
      done(new Error('Unexpected result'));
    }
    catch(err){
      done(minimatch(err.message, "Source input is not a vector, can't setup to a vector target input") ? null : err);
    }

  });

  it("Should fail in setupFrom to set a scalar input based on in a vector input without supplying 'at'", (done) => {

    const inputA = Input.create('input: filePath');
    const inputB = Input.create('input: filePath[]');

    try{
      inputA.setupFrom(inputB);
      done(new Error('Unexpected result'));
    }
    catch(err){
      done(minimatch(err.message, "Target input is not a vector, can't setup from a vector target input without supplying 'at'") ? null : err);
    }

  });

  it("Should fail in setupFrom when 'at' is specified for a scalar source input", (done) => {

    const inputA = Input.create('input: filePath');
    const inputB = Input.create('input: filePath');

    try{
      inputA.setupFrom(inputB, 0);
      done(new Error('Unexpected result'));
    }
    catch(err){
      done(minimatch(err.message, "Can't use at, since the source input is not a vector") ? null : err);
    }
  });

  it("Should fail in setupFrom when 'at' is specified from a vector source input to a target vector input", (done) => {

    const inputA = Input.create('input: filePath[]');
    const inputB = Input.create('input: filePath[]');

    try{
      inputA.setupFrom(inputB, 0);
      done(new Error('Unexpected result'));
    }
    catch(err){
      done(minimatch(err.message, "Can't use at, from a source vector input to a target vector input") ? null : err);
    }
  });

  it('Should fail if an item inside of the vector does not exist', (done) => {

    (async () => {

      const input = Input.create('input: filePath[]', {exists: true});
      input.value = [largeFilePath, largeFilePath, 'Fake!'];
      await input.validate();

    })().then((result) => {
      done(new Error('Not Expected'));

    }).catch((err) => {
      done(minimatch(err.message, 'File does not exist') ? null : err);
    });
  });

  it('Should not fail when file exists', (done) => {

    (async () => {

      const input = Input.create('input: filePath', {exists: true});
      input.value = smallFilePath;
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should return the stat result from the cache', (done) => {
    (async () => {

      const temporaryFile = `${tmp.fileSync().name}_statA`;
      fs.writeFileSync(temporaryFile, Array(1).join('0'));

      const input = Input.create('input: filePath');
      input.value = temporaryFile;

      await input.stat();

      // deleting the file
      fs.unlinkSync(temporaryFile);

      // now the value should be returned from the cache
      await input.stat();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should return the stat error from the cache', (done) => {
    (async () => {

      const temporaryFile = `${tmp.fileSync().name}_statB`;
      const input = Input.create('input: filePath', {exists: false});
      input.value = temporaryFile;

      try{
        await input.stat();
      }
      catch(err){
        // ...
      }

      // now writing the file
      fs.writeFileSync(temporaryFile, Array(1).join('0'));

      // it should get the value from the cache
      let success = false;
      try{
        await input.stat();
      }
      catch(err){
        success = true;
      }

      // no more need for the file
      fs.unlinkSync(temporaryFile);

      if (success){
        done();
      }
      else{
        done(new Error('Unexpected error'));
      }
    })();
  });

  it('Should not fail when file is smaller than the maximum size allowed', (done) => {

    (async () => {

      const input = Input.create('input: filePath', {maxFileSize: 5 * 1024 * 1024});
      input.value = smallFilePath;
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should match the extension', () => {

    const input = Input.create('input: filePath');
    assert.equal(input.extension(), '');

    input.value = '/some/path/test.ext';
    assert.equal(input.extension(), 'ext');

    input.value = '/some/path/test';
    assert.equal(input.extension(), '');
  });

  it('Should match the base name', () => {

    const input = Input.create('input: filePath');
    input.value = '/some/path/test.ext';

    assert.equal(input.basename(), 'test.ext');
  });

  it('Should match the dirname', () => {

    const input = Input.create('input: filePath');
    input.value = '/some/path/test.ext';

    assert.equal(input.dirname(), '/some/path');
  });

  it('Should fail when file is larger than the maximum size allowed', (done) => {

    (async () => {

      const input = Input.create('input: filePath', {maxFileSize: 5 * 1024 * 1024});
      input.value = largeFilePath;
      await input.validate();

    })().then((result) => {
      done(new Error('Unexpected result'));

    }).catch((err) => {
      done();
    });
  });

  it('Should fail when file extension is not under the allowed extensions', (done) => {

    (async () => {

      const input = Input.create('input: filePath', {allowedExtensions: ['jpg', 'png']});
      input.value = largeFilePath;
      await input.validate();

    })().then((result) => {
      done(new Error('Unexpected result'));

    }).catch((err) => {
      done();
    });
  });

  it('Should not fail when file extension is under the allowed extensions', (done) => {

    (async () => {

      const input = Input.create('input: filePath', {allowedExtensions: ['tmp', 'png']});
      input.value = largeFilePath;
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });
});
