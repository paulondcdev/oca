const assert = require('assert');
const Oca = require('../../../../src');

const Action = Oca.Action;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Basic Inputs (Vector):', () => {

  let server = null;
  let app = null;
  let port = null;

  class VectorInputs extends Action{
    constructor(){
      super();
      this.createInput('a: string[]');
      this.createInput('b: number[]');
      this.createInput('c: bool[]');
    }

    _perform(data){
      return Promise.resolve({
        a: data.a,
        b: data.b,
        c: data.c,
      });
    }
  }

  before((done) => {

    // registrations
    Oca.registerAction(VectorInputs);

    // webfying actions
    Oca.webfyAction(VectorInputs, ['get', 'post'], {restRoute: '/vectorTest'});

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

  it('Should perform an action associating multiple values to vector inputs through a form', (done) => {

    request.post(`http://localhost:${port}/vectorTest`, {
      form: {
        a: ['text1', 'text2'],
        b: [1, 2, 3],
        c: [1, 0],
      },
    }, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a.length, 2);
        assert.equal(result.data.a[0], 'text1');
        assert.equal(result.data.a[1], 'text2');

        assert.equal(result.data.b.length, 3);
        assert.equal(result.data.b[0], 1);
        assert.equal(result.data.b[1], 2);
        assert.equal(result.data.b[2], 3);

        assert.equal(result.data.c.length, 2);
        assert.equal(result.data.c[0], 1);
        assert.equal(result.data.c[1], 0);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action associating multiple values to vector inputs through paramName[] syntax', (done) => {

    request(`http://localhost:${port}/vectorTest?a[]=text1&a[]=text2&b[]=1&b[]=2&b[]=3&c[]=1&c[]=0`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a.length, 2);
        assert.equal(result.data.a[0], 'text1');
        assert.equal(result.data.a[1], 'text2');

        assert.equal(result.data.b.length, 3);
        assert.equal(result.data.b[0], 1);
        assert.equal(result.data.b[1], 2);
        assert.equal(result.data.b[2], 3);

        assert.equal(result.data.c.length, 2);
        assert.equal(result.data.c[0], 1);
        assert.equal(result.data.c[1], 0);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action associating multiple values to vector inputs through repeating the param name multiple times', (done) => {

    request(`http://localhost:${port}/vectorTest?a=text1&a=text2&b=1&b=2&b=3&c=1&c=0`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a.length, 2);
        assert.equal(result.data.a[0], 'text1');
        assert.equal(result.data.a[1], 'text2');

        assert.equal(result.data.b.length, 3);
        assert.equal(result.data.b[0], 1);
        assert.equal(result.data.b[1], 2);
        assert.equal(result.data.b[2], 3);

        assert.equal(result.data.c.length, 2);
        assert.equal(result.data.c[0], 1);
        assert.equal(result.data.c[1], 0);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should perform an action associating multiple values to vector inputs through json syntax', (done) => {

    request(`http://localhost:${port}/vectorTest?a=["text1","text2"]&b=[1,2,3]&c=[1,0]`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 200);

        const result = JSON.parse(body);
        assert.equal(result.data.a.length, 2);
        assert.equal(result.data.a[0], 'text1');
        assert.equal(result.data.a[1], 'text2');

        assert.equal(result.data.b.length, 3);
        assert.equal(result.data.b[0], 1);
        assert.equal(result.data.b[1], 2);
        assert.equal(result.data.b[2], 3);

        assert.equal(result.data.c.length, 2);
        assert.equal(result.data.c[0], 1);
        assert.equal(result.data.c[1], 0);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
