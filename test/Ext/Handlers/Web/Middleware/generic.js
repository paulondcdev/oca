const assert = require('assert');
const Oca = require('../../../../../src');
const testutils = require('../../../../../testutils');

const Action = Oca.Action;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Middleware Generic:', () => {
  let server = null;
  let port = null;
  let app = null;

  class TestBeforeMiddleware extends Action{
    constructor(){
      super();
      this.createInput('a: numeric', {autofill: 'customValue'});
    }
    _perform(data){
      return data.a;
    }
  }

  before((done) => {
    // registrations
    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum');
    Oca.registerAction(TestBeforeMiddleware);

    // express server
    app = express();
    server = app.listen(0, () => {
      done();
    });

    port = server.address().port;
  });

  after(() => {
    // cleaning any registration made by other tests
    Oca.Ext.Handlers.Web._beforeActionMiddlewares = [];

    if (server){
      server.close();
    }
  });

  // tests
  it('Should perform an action', (done) => {
    Oca.webfyAction(testutils.Actions.Shared.Sum, 'get');

    app.get('/sum', Oca.middleware('sum', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    request(`http://localhost:${port}/sum?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        assert.equal(body, 'result: 20');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should fail to perform an action through a non webfied method (patch)', (done) => {
    Oca.webfyAction(testutils.Actions.Shared.Sum, 'get', {auth: false, rest: false});

    app.patch('/sum', Oca.middleware('sum', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    app.use((err, req, res, next) => {
      res.status(err.status || 500);
      res.json({
        message: err.message,
        error: err,
      });
    });

    request.patch(`http://localhost:${port}/sum?a=10&b=10`, (err, response, body) => {

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

  it('Should perform an action and handle the error result', (done) => {
    Oca.webfyAction(testutils.Actions.Shared.Sum, 'get', {auth: false, rest: false});

    app.get('/sum2', Oca.middleware('sum', (err, result, req, res, next) => {
      if (err && err.code === '28a03a60-a405-4737-b94d-2b695b6ce156'){
        res.send('success');
      }
      else{
        next(new Error('It did not get an error as it was expected'));
      }
    }));

    request(`http://localhost:${port}/sum2?a=10`, (err, response, body) => {
      if (err){
        return done(err);
      }

      let error = null;

      try{
        assert.equal(response.statusCode, 200);
        assert.equal(body, 'success');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Tests if Oca.addBeforeAction middlewares are being called', (done) => {

    Oca.addBeforeAction((req, res, next) => {
      res.locals.web.session().setAutofill('customValue', 13);
      next();
    });

    Oca.webfyAction(TestBeforeMiddleware, 'get');

    app.get('/beforeMiddlewareTest', Oca.middleware('TestBeforeMiddleware', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    request(`http://localhost:${port}/beforeMiddlewareTest`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        assert.equal(body, 'result: 13');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
