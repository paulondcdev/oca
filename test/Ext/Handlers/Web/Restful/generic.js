const assert = require('assert');
const Oca = require('../../../../../src');
const testutils = require('../../../../../testutils');

const Action = Oca.Action;
const Settings = Oca.Settings;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Restful Generic:', () => {

  let server = null;
  let app = null;
  let port = null;

  class ForceToFail extends Oca.Action{
    _perform(data){
      return Promise.reject(new Error('Forced to fail'));
    }
  }

  class CheckRemoteAddress extends Action{
    constructor(){
      super();
      this.createInput('ipAddress: ip', {autofill: 'remoteAddress', hidden: true});
    }

    _perform(data){
      return Promise.resolve(data.ipAddress);
    }
  }

  class UndefinedResult extends Oca.Action{
    _perform(data){
      this.setMetadata('handler.web.writeOptions.extendOutput', {
        data: {
          myCustomDataA: 1,
          myCustomDataB: 2,
        },
      });

      return Promise.resolve();
    }
  }

  class JSONRepresentation extends Oca.Action{
    _perform(data){

      class _CustomRepresentation{
        toJSON(){
          return {
            a: 1,
            b: 2,
          };
        }
      }

      return Promise.resolve(new _CustomRepresentation());
    }
  }

  before((done) => {

    // registrations
    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum');
    Oca.registerAction(ForceToFail);
    Oca.registerAction(CheckRemoteAddress);
    Oca.registerAction(UndefinedResult);
    Oca.registerAction(JSONRepresentation);

    // webfying actions
    Oca.webfyAction('sum', 'get', {restRoute: '/A'});
    Oca.webfyAction('sum', 'patch', {restRoute: '/A/:a/test'});
    Oca.webfyAction(ForceToFail, 'get', {restRoute: '/forceToFail'});
    Oca.webfyAction(CheckRemoteAddress, 'get', {restRoute: '/checkRemoteAddress'});
    Oca.webfyAction(UndefinedResult, 'get', {restRoute: '/undefinedResult'});
    Oca.webfyAction(JSONRepresentation, 'get', {restRoute: '/jsonRepresentation'});


    // express server
    app = express();
    server = app.listen(0, () => {
      done();
    });

    Oca.restful(app);

    port = server.address().port;
  });

  after(() => {
    if (server){
      server.close();
    }
  });

  it('Should test if the remoteAddress is being set by the autofill', (done) => {
    request(`http://localhost:${port}/checkRemoteAddress?ipAddress=0`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, '::ffff:127.0.0.1');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should assign an input value as autofill', (done) => {

    class AvailableActionE extends Action{
      constructor(){
        super();

        this.createInput('a: text', {autofill: 'userId'});
        this.createInput('b: text', {autofill: 'projectId'});
        this.createInput('c: text', {required: false});
      }

      _perform(data){
        return Promise.resolve({
          a: data.a,
          b: data.b,
          c: data.c,
        });
      }
    }

    Oca.registerAction(AvailableActionE);

    class TestAutofillAction extends Action{
      constructor(){
        super();

        this.createInput('a: text', {autofill: 'userId'});
        this.createInput('b: text', {autofill: 'projectId'});
        this.createInput('c: text');
      }

      _perform(data){
        const action = this.createAction('AvailableActionE');
        return action.execute();
      }
    }

    Oca.registerAction(TestAutofillAction);
    Oca.webfyAction(TestAutofillAction, 'post', {auth: false, restRoute: '/TestAutofillAction'});
    Oca.restful(app);

    const postFormData = {
      a: 'TestA',
      b: 'TestB',
      c: 'TestC',
    };

    request.post(`http://localhost:${port}/TestAutofillAction`, {formData: postFormData}, (err, response, body) => {

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

  it('Should perform an action through rest', (done) => {

    request(`http://localhost:${port}/A?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through rest specifying custom parameters', (done) => {

    request.patch(`http://localhost:${port}/A/20/test`, {formData: {b: 10}}, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 30);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through GET when an input required is not defined', (done) => {

    request(`http://localhost:${port}/A?a=10`, (err, response, body) => {

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

  it('Should fail to perform an action that raises an exception', (done) => {

    request.get(`http://localhost:${port}/forceToFail`, (err, response, body) => {

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

  it('Should fail to perform an action through PATCH when the action is webfied with a different method', (done) => {

    request.patch(`http://localhost:${port}/A?a=10&b=30`, {formData: {a: 10, b: 30}}, (err, response, body) => {

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

  it('Should fail to perform an invalid action that is not registered', (done) => {

    request.delete(`http://localhost:${port}/A/SimpleSumActionDelete?a=10&b=30`, (err, response, body) => {
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

  it('Should test the defaults of the web handler', (done) => {
    class WebCustom extends Oca.Ext.Handlers.Web{
    }

    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum.testDefault');
    Oca.registerHandler(WebCustom, 'web', 'sum.testDefault');
    Oca.webfyAction('sum.testDefault', 'get', {auth: false, restRoute: '/testDefault'});
    Oca.restful(app);

    request(`http://localhost:${port}/testDefault?a=5&b=5`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 10);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action using a registered with a custom route', (done) => {

    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum');
    Oca.webfyAction('sum', 'get', {auth: false, restRoute: '/:api/a/b/c/Sum'});
    Oca.restful(app);

    request(`http://localhost:${port}/10.0.1/a/b/c/Sum?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should use a prefix in the restful support', (done) => {
    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum.testPrefix');
    Oca.webfyAction('sum.testPrefix', 'get', {restRoute: '/testPrefix'});
    Oca.restful(app, '/myApi');

    request(`http://localhost:${port}/myApi/testPrefix?a=5&b=5`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.value, 10);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should be able to response to an action that does not have a returning value', (done) => {

    request(`http://localhost:${port}/undefinedResult`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(Object.keys(result.data).length, 2);
        assert.equal(result.data.myCustomDataA, 1);
        assert.equal(result.data.myCustomDataB, 2);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should cast the value used in the response to the json representation defined in the result', (done) => {

    request(`http://localhost:${port}/jsonRepresentation`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(Object.keys(result.data).length, 2);
        assert.equal(result.data.a, 1);
        assert.equal(result.data.b, 2);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
