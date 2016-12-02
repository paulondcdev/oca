const assert = require('assert');
const Oca = require('../src');

const Action = Oca.Action;
const Provider = Oca.Provider;
const Settings = Oca.Settings;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line
const passport = require('passport'); // eslint-disable-line
const BasicStrategy = require('passport-http').BasicStrategy; // eslint-disable-line


describe('Middleware:', () => {
  let server = null;
  let port = null;
  let app = null;

  // initializing oca
  Oca.initialize();

  // provider used by the tests
  class SomeProvider extends Provider{}

  // action used by the tests
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

  const passportAuth = passport.authenticate('basic', {session: false});

  before((done) => {

    // registrations
    Oca.registerProvider(SomeProvider);
    Oca.webfyProvider(SomeProvider);
    Oca.registerAction('SomeProvider', Sum);

    // auth
    passport.use(new BasicStrategy(
      (username, password, authDone) => {
        if (username.valueOf() === 'someUser' &&
          password.valueOf() === '123456'){
          return authDone(null, true);
        }
        return authDone(null, false);
      }));

    // express server
    app = express();
    app.use(passport.initialize());
    app.use(Oca.restful());
    server = app.listen(0, () => {
      done();
    });

    Settings.authenticate = passportAuth;
    port = server.address().port;
  });

  after(() => {
    if (server){
      server.close();
    }
  });

  // tests
  it('Should perform an action', (done) => {
    Oca.webfyAction('SomeProvider', Sum, Oca.Method.Get, {auth: false, rest: false});

    app.get('/sum', Oca.middleware('SomeProvider/Sum', (err, result, req, res, next) => {
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

  it('Should fail to perform an action that requires auth without any login', (done) => {
    Oca.webfyAction('SomeProvider', Sum, Oca.Method.Get, {auth: true, rest: false});

    app.get('/authSum', Oca.middleware('SomeProvider/Sum', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    request(`http://localhost:${port}/authSum?a=10&b=10`, (err, response, body) => {

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

  it('Should perform an action that requires auth', (done) => {
    Oca.webfyAction('SomeProvider', Sum, Oca.Method.Get, {auth: true, rest: false});

    app.get('/authSum', Oca.middleware('SomeProvider/Sum', (err, result, req, res, next) => {
      if (err) return next(err);
      res.send(`result: ${result}`);
    }));

    request(`http://someUser:123456@localhost:${port}/authSum?a=10&b=10`, (err, response, body) => {

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

  it('Should perform an action and handle the error result', (done) => {
    Oca.webfyAction('SomeProvider', Sum, Oca.Method.Get, {auth: false, rest: false});

    app.get('/sum2', Oca.middleware('SomeProvider/Sum', (err, result, req, res, next) => {
      if (err && err.message === 'Input is required, it cannot be empty!'){
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
});
