const assert = require('assert');
const Oca = require('../src');

const Action = Oca.Action;
const Provider = Oca.Provider;
const Settings = Oca.Settings;
const RequestHandler = Oca.RequestHandler;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line
const passport = require('passport'); // eslint-disable-line
const BasicStrategy = require('passport-http').BasicStrategy; // eslint-disable-line


describe('Restful:', () => {

  // initializing oca
  Oca.initialize();

  let server = null;
  let app = null;
  let port = null;
  const passportAuth = passport.authenticate('basic', {session: false});
  const uploadPreserveFileNameDefault = Settings.uploadPreserveFileName;

  class BasicProvider extends Provider{}

  class AuthRequestHandler extends RequestHandler{
    static get authenticate(){
      return passport.authenticate('basic2', {session: false});
    }
  }

  class CustomAuthProvider extends Provider{
    requestHandler(){
      return new AuthRequestHandler(this.session);
    }
  }

  class SimpleSumAction extends Action{
    constructor(){
      super();
      this.createInput('a: numeric');
      this.createInput('b: numeric');
      this.createInput('forceFail?: bool');
    }

    _perform(){
      if (this.input('forceFail').value){
        return Promise.reject(new Error('Forced to fail'));
      }
      return Promise.resolve(this.input('a').value + this.input('b').value);
    }
  }

  class SimpleUploadAction extends Action{
    constructor(){
      super();
      this.createInput('a: text');
      this.createInput('file: filePath', {allowedExtensions: ['bin']});
    }

    async _perform(){
      const fileOperation = Provider.create('FileOperation', this.session);
      const checksum = fileOperation.createAction('Checksum');
      checksum.input('file').setupFrom(this.input('file'));

      return {
        a: this.input('a').value,
        fileHash: await checksum.execute(),
        fileName: this.input('file').basename(),
      };
    }

    async _finalize(err, value){
      // deleting the file
      const fileOperation = Provider.create('FileOperation', this.session);
      const deleteAction = fileOperation.createAction('Delete');
      deleteAction.input('file').setupFrom(this.input('file'));
      await deleteAction.execute();

      return await Action.prototype._finalize.call(this, err, value);
    }
  }

  class SimpleVectorUploadAction extends Action{
    constructor(){
      super();
      this.createInput('a: text');
      this.createInput('file: filePath[]', {allowedExtensions: ['bin']});
    }

    async _perform(){
      const fileOperation = Provider.create('FileOperation', this.session);
      const checksum = fileOperation.createAction('Checksum');

      checksum.input('file').value = this.input('file').value[0];
      const file1 = await checksum.execute();

      checksum.input('file').value = this.input('file').value[1];
      const file2 = await checksum.execute();

      checksum.input('file').value = this.input('file').value[2];
      const file3 = await checksum.execute();

      const result = {};
      result[this.input('a').name] = this.input('a').value;
      result[this.input('file').basename(0)] = file1;
      result[this.input('file').basename(1)] = file2;
      result[this.input('file').basename(2)] = file3;

      return result;
    }

    async _finalize(err, value){
      // deleting files
      const fileOperation = Provider.create('FileOperation', this.session);
      const deleteAction = fileOperation.createAction('Delete');

      for (const fileName of this.input('file').value){
        deleteAction.input('file').value = fileName;
        await deleteAction.execute();
      }

      return await Action.prototype._finalize.call(this, err, value);
    }
  }

  class BasicProviderB extends Provider{}

  before((done) => {

    // registrations
    Oca.registerProvider(BasicProvider);
    Oca.registerProvider(BasicProviderB);
    Oca.registerProvider(CustomAuthProvider);

    Oca.webfyProvider(BasicProvider);
    Oca.webfyProvider(BasicProviderB);
    Oca.webfyProvider(CustomAuthProvider);

    Oca.registerAction(BasicProvider, SimpleSumAction);
    Oca.registerAction(BasicProvider, SimpleUploadAction);
    Oca.registerAction(BasicProvider, SimpleUploadAction, 'SimpleUploadAction1');
    Oca.registerAction(BasicProvider, SimpleVectorUploadAction);
    Oca.registerAction(BasicProviderB, SimpleSumAction);
    Oca.registerAction(BasicProviderB, SimpleSumAction, 'SimpleSumActionDelete');
    Oca.registerAction(CustomAuthProvider, SimpleSumAction);

    Oca.webfyAction(BasicProvider, SimpleUploadAction, Oca.Method.Post);
    Oca.webfyAction(BasicProvider, SimpleSumAction, Oca.Method.Get);
    Oca.webfyAction(BasicProvider, 'SimpleUploadAction1', Oca.Method.Put);
    Oca.webfyAction(BasicProvider, SimpleVectorUploadAction, Oca.Method.Post);
    Oca.webfyAction(BasicProviderB, SimpleSumAction, Oca.Method.Get | Oca.Method.Post, {auth: true});
    Oca.webfyAction(BasicProviderB, 'SimpleSumActionDelete', Oca.Method.Delete, {auth: true});
    Oca.webfyAction(CustomAuthProvider, SimpleSumAction, Oca.Method.Get | Oca.Method.Post, {auth: true});

    // auth 1
    passport.use(new BasicStrategy(
      (username, password, authDone) => {
        if (username.valueOf() === 'someUser' &&
          password.valueOf() === '1234'){
          return authDone(null, true);
        }
        return authDone(null, false);
      }));

    // auth 2
    const customBasicStrategy = new BasicStrategy(
      (username, password, authDone) => {
        if (username.valueOf() === 'someUser2' &&
          password.valueOf() === '12345'){
          return authDone(null, true);
        }
        return authDone(null, false);
      });
    customBasicStrategy.name = 'basic2';
    passport.use(customBasicStrategy);

    // express server
    app = express();
    app.use(passport.initialize());
    server = app.listen(0, () => {
      done();
    });

    app.use(Oca.restful(passportAuth));
    port = server.address().port;
  });

  after(() => {
    if (server){
      server.close();
    }
  });

  it('Should fail to webfy an invalid action name', () => {

    let success = false;
    try{
      Provider.webfyAction(BasicProviderB, 'NonExistingAction', Oca.Method.Get);
    }
    catch(err){
      success = (err.message === 'Action not registered!');
    }
    assert(success);
  });

  it('Should test if the remoteAddress is being set by the autofill', (done) => {

    class CheckRemoteAddress extends Action{
      constructor(){
        super();
        this.createInput('ipAddress: ip', {autofill: 'remoteAddress', private: true});
      }

      _perform(){
        return Promise.resolve(this.input('ipAddress').value);
      }
    }
    Provider.registerAction('BasicProvider', CheckRemoteAddress);
    Provider.webfyAction('BasicProvider', CheckRemoteAddress, Oca.Method.Get);

    request(`http://localhost:${port}/BasicProvider/CheckRemoteAddress?ipAddress=0`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data, '::ffff:127.0.0.1');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through rest', (done) => {

    request(`http://localhost:${port}/BasicProvider/SimpleSumAction?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through GET when an input required is not defined', (done) => {

    request(`http://localhost:${port}/BasicProvider/SimpleSumAction?a=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 550);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action that raises an exception', (done) => {

    request.get(`http://localhost:${port}/BasicProvider/SimpleSumAction?a=10&b=30&forceFail=true`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 500);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through DELETE when the action is webfied with a different method (GET)', (done) => {

    request.delete(`http://localhost:${port}/BasicProvider/SimpleSumAction?a=10&b=30`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 405);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an invalid action that is not registered for the provider', (done) => {

    request.delete(`http://localhost:${port}/BasicProvider/SimpleSumActionDelete?a=10&b=30`, (err, response, body) => {
      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 404);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action with the context set', (done) => {

    request.get(`http://localhost:${port}/BasicProvider/SimpleSumAction?a=10&b=30&context=test`, {
    }, (err, response, body) => {
      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.context, 'test');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should execute an action using through a custom action route name', (done) => {

    Provider.registerAction('BasicProvider', SimpleSumAction, 'SimpleSumAction1');
    Provider.webfyAction('BasicProvider', 'SimpleSumAction1', Oca.Method.Get | Oca.Method.Post, {auth: true, rest: true, restRoute: 'customName'});

    request.get(`http://localhost:${port}/BasicProvider/customName?a=10&b=30`, {
      auth: {
        user: 'someUser',
        pass: '1234',
        sendImmediately: true,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data, 40);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through GET that is restricted by auth', (done) => {

    request.get(`http://localhost:${port}/CustomAuthProvider/SimpleSumAction?a=10&b=30`, {
      auth: {
        user: 'someUser2',
        pass: '12345',
        sendImmediately: true,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data, 40);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through POST that is restricted by auth (Settings.authentication)', (done) => {
    request.post(`http://localhost:${port}/BasicProviderB/SimpleSumAction`, {
      auth: {
        user: 'someUser',
        pass: '1234',
        sendImmediately: true,
      },
      form: {
        a: 10,
        b: 30,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data, 40);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through POST that is restricted by auth (custom RequestHandler.authentication)', (done) => {
    request.post(`http://localhost:${port}/CustomAuthProvider/SimpleSumAction`, {
      auth: {
        user: 'someUser2',
        pass: '12345',
        sendImmediately: true,
      },
      form: {
        a: 10,
        b: 30,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data, 40);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through PUT (method not webfied by the action) that is restricted by auth (basic)', (done) => {
    request.put(`http://localhost:${port}/CustomAuthProvider/SimpleSumAction`, {
      auth: {
        user: 'someUser2',
        pass: '12345',
        sendImmediately: true,
      },
      form: {
        a: 10,
        b: 30,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 405);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through DELETE that is restricted by auth', (done) => {

    request.delete(`http://localhost:${port}/BasicProviderB/SimpleSumActionDelete?a=20&b=30`, {
      auth: {
        user: 'someUser',
        pass: '1234',
        sendImmediately: false,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data, 50);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should not be able to perform an action through GET that requires auth', (done) => {

    request.get(`http://localhost:${port}/CustomAuthProvider/SimpleSumAction?a=10&b=30`, {
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 401);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through GET by a wrong auth', (done) => {

    request.get(`http://localhost:${port}/CustomAuthProvider/SimpleSumAction?a=10&b=30`, {
      auth: {
        user: 'someUser1',
        pass: '12345',
        sendImmediately: true,
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 401);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through POST where the file is defined as string rather than coming from a upload', (done) => {

    request.post(`http://localhost:${port}/BasicProvider/SimpleUploadAction`, {
      form: {
        a: 'some value',
        file: '/a/custom/filePath.bin',
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 550);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it("Should perform an action through POST where the file can be defined as string and 'restrictRequestAccess' is set to false", (done) => {

    class TestRestrictRequestAccessAction extends Action{
      constructor(){
        super();
        this.createInput('a: text');
        this.createInput('file: filePath', {allowedExtensions: ['bin'], restrictRequestAccess: false});
      }

      _perform(){
        return Promise.resolve({
          a: this.input('a').value,
          file: this.input('file').value,
        });
      }
    }

    Provider.registerAction('BasicProvider', TestRestrictRequestAccessAction);
    Provider.webfyAction('BasicProvider', TestRestrictRequestAccessAction, Oca.Method.Post, {auth: false});

    request.post(`http://localhost:${port}/BasicProvider/TestRestrictRequestAccessAction`, {
      form: {
        a: 'some value',
        file: '/a/custom/filePath.bin',
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, 'some value');
        assert.equal(result.data.file, '/a/custom/filePath.bin');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it("Should perform an action through POST where the file is uploaded and 'restrictRequestAccess' is set to false", (done) => {

    class TestRestrictRequestAccessAction extends SimpleUploadAction{
      constructor(){
        super();
        this.input('file').assignProperty('restrictRequestAccess', false);
      }
    }

    Provider.registerAction('BasicProvider', TestRestrictRequestAccessAction);
    Provider.webfyAction('BasicProvider', TestRestrictRequestAccessAction, Oca.Method.Post, {auth: false});

    const postFormData = {
      a: 'some value',

      file: {
        value: new Buffer([1, 2, 3]),
        options: {
          filename: 'foo.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.post(`http://localhost:${port}/BasicProvider/TestRestrictRequestAccessAction`, {formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, 'some value');
        assert.equal(result.data.fileHash, '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through POST with single file upload (keeping the original name)', (done) => {

    const postFormData = {
      a: 'some value',

      file: {
        value: new Buffer([1, 2, 3]),
        options: {
          filename: 'foo|:?*"\0<>.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.post({url: `http://localhost:${port}/BasicProvider/SimpleUploadAction`, formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.fileHash, '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
        assert.equal(result.data.fileName, 'foo________.bin');
        assert.equal(result.data.a, postFormData.a);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through POST with single file upload (not keeping the original name)', (done) => {

    Settings.uploadPreserveFileName = false;

    const postFormData = {
      a: 'some value',

      file: {
        value: new Buffer([1, 2, 3]),
        options: {
          filename: 'foo.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.post({url: `http://localhost:${port}/BasicProvider/SimpleUploadAction`, formData: postFormData}, (err, response, body) => {

      // restoring the default value
      Settings.uploadPreserveFileName = uploadPreserveFileNameDefault;

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);

        assert.equal(result.data.fileHash, '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
        assert(result.data.fileName.startsWith('upload_'));
        assert.equal(result.data.a, postFormData.a);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through POST with multiple files upload for the same input (vector) keeping the file names', (done) => {

    const postFormData = {
      // Pass a simple key-value pair
      a: 'some value',

      file: [
        {
          value: new Buffer([1, 2, 3]),
          options: {
            filename: 'foo.bin',
            contentType: 'application/bin',
          },
        },
        {
          value: new Buffer([1, 2]),
          options: {
            filename: 'foo1.bin',
            contentType: 'application/bin',
          },
        },
        {
          value: new Buffer([1, 2]),
          options: {
            filename: 'foo2.bin',
            contentType: 'application/bin',
          },
        },
      ],
    };

    request.post({url: `http://localhost:${port}/BasicProvider/SimpleVectorUploadAction`, formData: postFormData}, (err, response, body) => {

      // restoring the default value
      Settings.uploadPreserveFileName = uploadPreserveFileNameDefault;

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, postFormData.a);
        assert.equal(result.data['foo.bin'], '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81');
        assert.equal(result.data['foo1.bin'], 'a12871fee210fb8619291eaea194581cbd2531e4b23759d225f6806923f63222');
        assert.equal(result.data['foo2.bin'], 'a12871fee210fb8619291eaea194581cbd2531e4b23759d225f6806923f63222');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through POST with multiple files upload for the same input (vector) and not keeping the original names', (done) => {

    Settings.uploadPreserveFileName = false;

    const postFormData = {
      // Pass a simple key-value pair
      a: 'some value',
      file: [
        {
          value: new Buffer([1, 2, 3]),
          options: {
            filename: 'foo.bin',
            contentType: 'application/bin',
          },
        },
        {
          value: new Buffer([1, 2]),
          options: {
            filename: 'foo1.bin',
            contentType: 'application/bin',
          },
        },
        {
          value: new Buffer([1, 2, 4]),
          options: {
            filename: 'foo2.bin',
            contentType: 'application/bin',
          },
        },
      ],
    };

    request.post({url: `http://localhost:${port}/BasicProvider/SimpleVectorUploadAction`, formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, postFormData.a);

        // can't guarantee the order of the uploaded files
        const hashes = [
          '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81',
          'a12871fee210fb8619291eaea194581cbd2531e4b23759d225f6806923f63222',
          'd4b29a968c40173638ded8d174c86957afa211be479cee020dba5dfe127d91ca',
        ];

        let foundCount = 0;
        for (const baseName in result.data){
          if (baseName !== 'a'){
            foundCount++;
            assert(baseName.startsWith('upload_'), `Wrong prefix: ${baseName} (expected: upload_)!`);
            assert(hashes.includes(result.data[baseName]), `Wrong hash: ${result.data[baseName]}`);
          }
        }
        assert.equal(foundCount, 3);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through PUT (with file upload)', (done) => {

    const postFormData = {
      // Pass a simple key-value pair
      a: 'some value',

      file: {
        value: new Buffer([1, 2]),
        options: {
          filename: 'foo.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.put({url: `http://localhost:${port}/BasicProvider/SimpleUploadAction1`, formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.fileHash, 'a12871fee210fb8619291eaea194581cbd2531e4b23759d225f6806923f63222');
        assert.equal(result.data.a, postFormData.a);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should assign an input value as autofill', (done) => {

    class TestAutofillAction extends Action{
      constructor(){
        super();

        this.createInput('a: text', {autofill: 'userId'});
        this.createInput('b: text', {autofill: 'projectId'});
        this.createInput('c: text');
      }

      _perform(){
        const action = Provider.create('BasicProvider', this.session).createAction('AvailableActionE');
        return action.execute();
      }
    }

    Provider.registerAction('BasicProvider', TestAutofillAction);
    Provider.webfyAction('BasicProvider', TestAutofillAction, Oca.Method.Post, {auth: false});

    class AvailableActionE extends Action{
      constructor(){
        super();

        this.createInput('a: text', {autofill: 'userId'});
        this.createInput('b: text', {autofill: 'projectId'});
        this.createInput('c: text', {required: false});
      }

      _perform(){
        return Promise.resolve({
          a: this.input('a').value,
          b: this.input('b').value,
          c: this.input('c').value,
        });
      }
    }

    Provider.registerAction('BasicProvider', AvailableActionE);

    const postFormData = {
      a: 'TestA',
      b: 'TestB',
      c: 'TestC',
    };

    request.post(`http://localhost:${port}/BasicProvider/TestAutofillAction`, {formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, 'TestA');
        assert.equal(result.data.b, 'TestB');
        assert.equal(result.data.c, null);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action using a provider registered with a custom route', (done) => {

    class SomeProvider extends Provider{}
    Oca.registerProvider(SomeProvider);
    Oca.webfyProvider(SomeProvider, {restRoute: 'api/someProvider/a/b/c'});

    class Sum extends Action{
      constructor(){
        super();

        this.createInput('a: numeric');
        this.createInput('b: numeric');
      }

      _perform(){
        return Promise.resolve(this.input('a').value + this.input('b').value);
      }
    }
    Oca.registerAction('SomeProvider', Sum);
    Oca.webfyAction('SomeProvider', Sum, Oca.Method.Get, {auth: false, rest: true});

    request(`http://localhost:${port}/api/someProvider/a/b/c/Sum?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an invisible action', (done) => {

    class SomeProvider extends Provider{}
    Oca.registerProvider(SomeProvider);
    Oca.webfyProvider(SomeProvider);

    class Sum extends Action{
      constructor(){
        super();

        this.createInput('a: numeric');
        this.createInput('b: numeric');
      }

      _perform(){
        return Promise.resolve(this.input('a').value + this.input('b').value);
      }
    }
    Oca.registerAction('SomeProvider', Sum);
    Oca.webfyAction('SomeProvider', Sum, Oca.Method.Get, {auth: false, rest: false});

    request(`http://localhost:${port}/SomeProvider/Sum?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 404);

        const result = JSON.parse(body);
        assert.equal(result.error.message, 'Action not available');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
