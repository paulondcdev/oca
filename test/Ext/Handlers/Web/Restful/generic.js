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

  before((done) => {

    // registrations
    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum');
    Oca.registerAction(ForceToFail);
    Oca.registerAction(CheckRemoteAddress);

    // webfying actions
    Oca.webfyAction('sum', 'get', {restRoute: '/A'});
    Oca.webfyAction('sum', 'patch', {restRoute: '/A/:a/test'});
    Oca.webfyAction(ForceToFail, 'get', {restRoute: '/forceToFail'});
    Oca.webfyAction(CheckRemoteAddress, 'get', {restRoute: '/D'});

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
    request(`http://localhost:${port}/D?ipAddress=0`, (err, response, body) => {

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

  it('Should assign an input value as autofill', (done) => {

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
        assert.equal(result.data, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action through rest specifying custom parameters', (done) => {

    request.patch(`http://localhost:${port}/A/20/test?b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data, 30);
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

    request.patch(`http://localhost:${port}/A?a=10&b=30`, (err, response, body) => {

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

  it('Should perform an action with the context set', (done) => {

    request.get(`http://localhost:${port}/A?a=10&b=30&context=test`, {
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

  it('Should test the defaults of the web handler', (done) => {
    class WebCustomParser extends Oca.Ext.Handlers.Web{
      loadToAction(action){
        return super.loadToAction(action);
      }
    }

    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum.testDefault');
    Oca.registerHandler(WebCustomParser, 'web', 'sum.testDefault');
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
        assert.equal(result.data, 10);
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
        assert.equal(result.data, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
