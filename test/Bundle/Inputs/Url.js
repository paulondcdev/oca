const fs = require('fs');
const tmp = require('tmp');
const assert = require('assert');
const express = require('express'); // eslint-disable-line
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Url Input:', () => {

  let server = null;
  let port = null;
  const fooDir = tmp.dirSync().name;
  const fooSmallFile = 'somethingSmall.foo';
  const fooLargeFile = 'somethingLarge.foo';

  before((done) => {

    // creating temporary files that will be used by the tests bellow (they get
    // removed automatically by the tmp library)
    fs.writeFileSync(`${fooDir}/${fooSmallFile}`, Array(1 * 1024 * 1024).join('0'));
    fs.writeFileSync(`${fooDir}/${fooLargeFile}`, Array(10 * 1024 * 1024).join('0'));

    const app = express();
    app.use('/', express.static(fooDir));

    server = app.listen(0, () => {
      done();
    });

    port = server.address().port;
  });

  after(() => {
    fs.unlinkSync(`${fooDir}/${fooSmallFile}`);
    fs.unlinkSync(`${fooDir}/${fooLargeFile}`);
    if (server){
      server.close();
    }
  });

  it('Input should start empty', () => {
    const input = Input.create('input: url');
    assert.equal(input.value, null);
  });

  it('Should match the extension', () => {

    const input = Input.create('input: url');
    input.value = 'http://somedomain.com/foo/someItem.ext?arg=1&arg2=2';

    assert.equal(input.extension(), 'ext');
  });

  it('Should match the protocol', () => {

    const input = Input.create('input: url');
    input.value = 'http://somedomain.com/foo/someItem.ext?arg=1&arg2=2';

    assert.equal(input.protocol(), 'http:');
  });

  it('Should fail when url does not exist', (done) => {

    (async () => {

      const input = Input.create('input: url', {exists: true});
      input.value = `http://localhost:${port}/wrongItem.foo`;
      await input.validate();

    })().then((result) => {
      done(new Error('unexpected value'));

    }).catch((err) => {
      done();
    });
  });

  it('Should fail when using a invalid protocol', (done) => {

    (async () => {

      const input = Input.create('input: url', {exists: true});
      input.value = `ftp://localhost:${port}/wrongItem.foo`;

      await input.validate();

    })().then((result) => {
      done(new Error('unexpected value'));

    }).catch((err) => {
      done();
    });
  });

  it('Should fail when url does not exist and the property exists is false', (done) => {

    (async () => {

      const input = Input.create('input: url', {exists: false});
      input.value = `http://localhost:${port}/wrongItem.foo`;
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should test protocol of a vector input', () => {

    const input = Input.create('input: url[]', {exists: true});
    input.value = [`http://localhost:${port}/${fooSmallFile}`, null];

    assert.equal(input.protocol(0), 'http:');
    assert.equal(input.protocol(1), '');
  });

  it('Should test extension of a vector input', () => {

    const input = Input.create('input: url[]', {exists: true});
    input.value = [`http://localhost:${port}/${fooSmallFile}`, null];

    assert.equal(input.extension(0), 'foo');
    assert.equal(input.extension(1), '');
  });

  it('Should test the cache for the headers (success)', (done) => {

    (async () => {

      const input = Input.create('input: url', {exists: true});
      input.value = `http://localhost:${port}/${fooSmallFile}`;
      await input.headers();
      server.close();

      await input.headers();
      server.listen(port);

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should test the cache for the headers (fail)', (done) => {

    (async () => {

      const input = Input.create('input: url', {exists: true});
      input.value = `http://localhost:${port}/${fooSmallFile}`;
      server.close();
      try{
        await input.headers();
      }
      catch(err){
        // ...
      }

      server.listen(port);
      await input.headers();

    })().then((result) => {
      done(new Error('Unexpected result'));

    }).catch((err) => {
      done(err.message === 'Request error' ? null : err);
    });
  });

  it('Should not fail when url exists', (done) => {

    (async () => {

      const input = Input.create('input: url', {exists: true});
      input.value = `http://localhost:${port}/${fooSmallFile}`;
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should not fail when file is smaller than the maximum size allowed', (done) => {

    (async () => {

      const input = Input.create('input: url', {maxContentSize: 5 * 1024 * 1024});
      input.value = `http://localhost:${port}/${fooSmallFile}`;
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });

  it('Should fail when file is larger than the maximum size allowed', (done) => {

    (async () => {

      const input = Input.create('input: url', {maxContentSize: 5 * 1024 * 1024});
      input.value = `http://localhost:${port}/${fooLargeFile}`;
      await input.validate();

    })().then((result) => {
      done(new Error('Unexpected result'));

    }).catch((err) => {
      done();
    });
  });

  it('Should fail when file extension is not under the allowed extensions', (done) => {

    (async () => {

      const input = Input.create('input: url', {allowedExtensions: ['jpg', 'png']});
      input.value = `http://localhost:${port}/${fooSmallFile}`;
      await input.validate();

    })().then((result) => {
      done(new Error('Unexpected result'));

    }).catch((err) => {
      done();
    });
  });

  it('Should not fail when file extension is under the allowed extensions', (done) => {

    (async () => {

      const input = Input.create('input: url', {allowedExtensions: ['foo', 'png']});
      input.value = `http://localhost:${port}/${fooSmallFile}`;
      await input.validate();

    })().then((result) => {
      done();

    }).catch((err) => {
      done(err);
    });
  });
});
