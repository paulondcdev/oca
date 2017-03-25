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
      this.setMetadata('handler.web.writeOptions', {
        headerOnly: true,
      });
    }
  }

  class SuccessStatus extends testutils.Actions.Shared.Sum{
    constructor(){
      super();
      this.setMetadata('handler.web.writeOptions', {
        successStatus: 201,
      });
    }
  }

  class CustomHeader extends Oca.Action{
    constructor(){
      super();
      this.createInput('customDate: string');
    }

    _perform(data){
      this.setMetadata('handler.web.writeOptions', {
        header: {
          date: data.customDate,
        },
      });

      return Promise.resolve(data.customDate);
    }
  }

  class ForceResultLabel extends Oca.Action{
    constructor(){
      super();
      this.createInput('resultType: string');
      this.createInput('resultLabel?: string');
    }

    _perform(data){

      if (data.resultLabel){
        this.setMetadata('handler.web.writeOptions', {
          successResultLabel: data.resultLabel,
        });
      }

      let result = 'a';
      if (data.resultType === 'vector'){
        result = ['a', 'b'];
      }
      if (data.resultType === 'object'){
        result = {a: 1, b: 2};
      }

      return Promise.resolve(result);
    }
  }

  class ExtendResult extends Oca.Action{
    _perform(data){
      this.setMetadata('handler.web.writeOptions', {
        extendOutput: {
          data: {
            test: 1,
            test2: 2,
          },
        },
      });

      return Promise.resolve(true);
    }
  }

  before((done) => {

    // registrations
    Oca.registerAction(HeaderOnly);
    Oca.registerAction(ForceResultLabel);
    Oca.registerAction(SuccessStatus);
    Oca.registerAction(CustomHeader);
    Oca.registerAction(ExtendResult);
    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum');

    // webfying actions
    Oca.webfyAction('sum', 'get', {restRoute: '/sum'});
    Oca.webfyAction(HeaderOnly, 'get', {restRoute: '/headerOnly'});
    Oca.webfyAction(SuccessStatus, 'get', {restRoute: '/successStatus'});
    Oca.webfyAction(CustomHeader, 'get', {restRoute: '/customHeader'});
    Oca.webfyAction(ForceResultLabel, 'get', {restRoute: '/forceResultLabel'});
    Oca.webfyAction(ExtendResult, 'get', {restRoute: '/extendOutput'});

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
        assert.equal(result.data.value, 20);
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
        assert.equal(testDate, result.data.value);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for a primitive value', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=primitive`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal('a', result.data.value);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for a primitive value (custom result label)', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=primitive&resultLabel=test`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal('a', result.data.test);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for a vector value', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=vector`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const value = [
          'a',
          'b',
        ];

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(value[0], result.data.items[0]);
        assert.equal(value[1], result.data.items[1]);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for a vector value (custom result label)', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=vector&resultLabel=test`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const value = [
          'a',
          'b',
        ];

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(value[0], result.data.test[0]);
        assert.equal(value[1], result.data.test[1]);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for an object value', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=object`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const value = {
          a: 1,
          b: 2,
        };

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(value.a, result.data.a);
        assert.equal(value.b, result.data.b);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test result for an object value (custom result label)', (done) => {

    request(`http://localhost:${port}/forceResultLabel?resultType=object&resultLabel=test`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const value = {
          a: 1,
          b: 2,
        };

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(value.a, result.data.test.a);
        assert.equal(value.b, result.data.test.b);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should test extendOutput option by extending the data', (done) => {

    request(`http://localhost:${port}/extendOutput`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        const extendData = {
          test: 1,
          test2: 2,
        };

        assert.equal(response.statusCode, 200);
        const result = JSON.parse(body);
        assert.equal(true, result.data.value);
        assert.equal(extendData.test, result.data.test);
        assert.equal(extendData.test2, result.data.test2);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
