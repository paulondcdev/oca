const assert = require('assert');
const Oca = require('../../../../src');
const testutils = require('../../../../testutils');
const uuid = require('uuid');
const path = require('path');
const fs = require('fs');

const Action = Oca.Action;
const Settings = Oca.Settings;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line
const passport = require('passport'); // eslint-disable-line
const BasicStrategy = require('passport-http').BasicStrategy; // eslint-disable-line


describe('Web Upload:', () => {

  let server = null;
  let app = null;
  let port = null;
  const uploadPreserveFileNameDefault = Settings.get('handler/web/uploadPreserveFileName');
  const customUploadDirectory = path.join(Settings.get('handler/web/uploadDirectory'), uuid.v1());

  class WebCustomUploadDir extends Oca.Ext.Handlers.Web{
    static get uploadDirectory(){
      return customUploadDirectory;
    }
  }

  class DisableRestrictWebAccessAction1 extends Action{
    constructor(){
      super();
      this.createInput('a: text');
      this.createInput('file: filePath', {allowedExtensions: ['bin'], restrictWebAccess: false});
    }

    _perform(data){
      return Promise.resolve({
        a: data.a,
        file: data.file,
      });
    }
  }

  class DisableRestrictWebAccessAction2 extends testutils.Actions.Shared.UploadAction{
    constructor(){
      super();
      this.input('file').assignProperty('restrictWebAccess', false);
    }
  }

  class UploadActionKeepFile extends testutils.Actions.Shared.UploadAction{
    _finalize(err, value){
      return (err) ? Promise.reject(err) : Promise.resolve(value);
    }
  }

  before((done) => {

    Oca.Handler.registerHandler(WebCustomUploadDir, 'web', 'uploadActionKeepFile');

    // registrations
    Oca.registerAction(testutils.Actions.Shared.UploadAction, 'uploadAction');
    Oca.registerAction(UploadActionKeepFile, 'uploadActionKeepFile');
    Oca.registerAction(testutils.Actions.Shared.VectorUploadAction, 'vectorUploadAction');
    Oca.registerAction(DisableRestrictWebAccessAction1);
    Oca.registerAction(DisableRestrictWebAccessAction2);

    // webfying actions
    Oca.webfyAction(testutils.Actions.Shared.UploadAction, 'post', {restRoute: '/E'});
    Oca.webfyAction('uploadActionKeepFile', 'put', {restRoute: '/E'});
    Oca.webfyAction(DisableRestrictWebAccessAction1, 'post', {auth: false, restRoute: '/E/DisableRestrictWebAccessAction1'});
    Oca.webfyAction(DisableRestrictWebAccessAction2, 'post', {auth: false, restRoute: '/E/DisableRestrictWebAccessAction2'});
    Oca.webfyAction('vectorUploadAction', 'post', {restRoute: '/E/VectorUploadAction'});

    // auth
    passport.use(new BasicStrategy(
      (username, password, authDone) => {
        if (username.valueOf() === 'user' &&
          password.valueOf() === '1234'){
          return authDone(null, 'user');
        }
        return authDone(null, false);
      }));

    // express server
    app = express();
    app.use(passport.initialize());
    server = app.listen(0, () => {
      done();
    });

    Oca.restful(app);

    port = server.address().port;
  });

  after(() => {
    fs.rmdirSync(customUploadDirectory);

    if (server){
      server.close();
    }
  });

  it('Should fail to perform an action through POST where the file is defined as string rather than coming from a upload', (done) => {

    request.post(`http://localhost:${port}/E`, {
      form: {
        a: 'A value',
        file: '/a/custom/filePath.bin',
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, Settings.get('error/validationFail/status'));
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it("Should perform an action through POST where the file can be defined as string and 'restrictWebAccess' is set to false", (done) => {

    request.post(`http://localhost:${port}/E/DisableRestrictWebAccessAction1`, {
      form: {
        a: 'A value',
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
        assert.equal(result.data.a, 'A value');
        assert.equal(result.data.file, '/a/custom/filePath.bin');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it("Should perform an action through POST where the file is uploaded and 'restrictWebAccess' is set to false", (done) => {

    const postFormData = {
      a: 'A value',

      file: {
        value: new Buffer([1, 2, 3]),
        options: {
          filename: 'foo.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.post(`http://localhost:${port}/E/DisableRestrictWebAccessAction2`, {formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a, 'A value');
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
      a: 'A value',

      file: {
        value: new Buffer([1, 2, 3]),
        options: {
          filename: 'foo|:?*"\0<>.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.post({url: `http://localhost:${port}/E`, formData: postFormData}, (err, response, body) => {

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

    Settings.set('handler/web/uploadPreserveFileName', false);

    const postFormData = {
      a: 'A value',

      file: {
        value: new Buffer([1, 2, 3]),
        options: {
          filename: 'foo.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.post({url: `http://localhost:${port}/E`, formData: postFormData}, (err, response, body) => {

      // restoring the default value
      Settings.set('handler/web/uploadPreserveFileName', uploadPreserveFileNameDefault);

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
      a: 'A value',

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

    request.post({url: `http://localhost:${port}/E/VectorUploadAction`, formData: postFormData}, (err, response, body) => {

      // restoring the default value
      Settings.set('handler/web/uploadPreserveFileName', uploadPreserveFileNameDefault);

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

    Settings.set('handler/web/uploadPreserveFileName', false);

    const postFormData = {
      // Pass a simple key-value pair
      a: 'A value',
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

    request.post({url: `http://localhost:${port}/E/VectorUploadAction`, formData: postFormData}, (err, response, body) => {

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

  it('Should perform an action using a custom upload folder through PUT', (done) => {

    const postFormData = {
      // Pass a simple key-value pair
      a: 'A value',

      file: {
        value: new Buffer([1, 2]),
        options: {
          filename: 'foo.bin',
          contentType: 'application/bin',
        },
      },
    };

    request.put({url: `http://localhost:${port}/E`, formData: postFormData}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.fileHash, 'a12871fee210fb8619291eaea194581cbd2531e4b23759d225f6806923f63222');
        assert.equal(result.data.a, postFormData.a);

        const fileFullPath = path.join(customUploadDirectory, result.data.fileName);
        assert(fs.existsSync(fileFullPath));
        fs.unlinkSync(fileFullPath);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
