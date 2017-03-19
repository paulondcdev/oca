const assert = require('assert');
const Oca = require('../../../../src');
const testutils = require('../../../../testutils');

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Write Options:', () => {

  let server = null;
  let app = null;
  let port = null;

  class HeaderOnly extends testutils.Actions.Shared.Sum{
    constructor(){
      super();
      this.metadata.handler.web = {
        writeOptions: {
          headerOnly: true,
        },
      };
    }
  }

  class SuccessStatus extends testutils.Actions.Shared.Sum{
    constructor(){
      super();
      this.metadata.handler.web = {
        writeOptions: {
          successStatus: 201,
        },
      };
    }
  }

  class CustomHeader extends Oca.Action{
    constructor(){
      super();
      this.createInput('customDate: string');
    }

    _perform(data){
      this.metadata.handler.web = {
        writeOptions: {
          header: {
            date: data.customDate,
          },
        },
      };

      return Promise.resolve(data.customDate);
    }
  }

  before((done) => {

    // registrations
    Oca.registerAction(HeaderOnly);
    Oca.registerAction(SuccessStatus);
    Oca.registerAction(CustomHeader);
    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum');

    // webfying actions
    Oca.webfyAction('sum', 'get', {restRoute: '/sum'});
    Oca.webfyAction(HeaderOnly, 'get', {restRoute: '/headerOnly'});
    Oca.webfyAction(SuccessStatus, 'get', {restRoute: '/successStatus'});
    Oca.webfyAction(CustomHeader, 'get', {restRoute: '/customHeader'});

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

  it('Tests the option headerOnly, no data should be expected in the response', (done) => {

    request(`http://localhost:${port}/headerOnly?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        assert.equal(body, '');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should have a custom success status code', (done) => {

    request(`http://localhost:${port}/successStatus?a=10&b=10`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 201);

        const result = JSON.parse(body);
        assert.equal(result.data, 20);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action with the context set', (done) => {

    request.get(`http://localhost:${port}/sum?a=10&b=30&context=test`, {
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

  it('Should have a custom date header', (done) => {

    const testDate = 'Wed, 25 May 1984 22:01:00 GMT';
    request(`http://localhost:${port}/customHeader?customDate=${testDate}`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        assert.equal(testDate, response.headers.date);

        const result = JSON.parse(body);
        assert.equal(testDate, result.data);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
