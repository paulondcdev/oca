const assert = require('assert');
const Oca = require('../../../../src');
const testutils = require('../../../../testutils');

const Action = Oca.Action;

// the modules bellow are optional integrations, only required as devDependencies
// for testing purpose
const request = require('request'); // eslint-disable-line
const express = require('express'); // eslint-disable-line


describe('Web Error Output:', () => {

  let server = null;
  let app = null;
  let port = null;

  class NestedActionFail extends Action{
    _perform(data){
      return this.createAction('sum').execute();
    }
  }

  before((done) => {

    // registrations
    Oca.registerAction(testutils.Actions.Shared.Sum, 'sum');
    Oca.registerAction(NestedActionFail);

    // webfying actions
    Oca.webfyAction('sum', ['get'], {restRoute: '/topLevelValidationFail'});
    Oca.webfyAction(NestedActionFail, ['get'], {restRoute: '/nestedActionFail'});

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

  it('Should response with the validation fail code raised by a top level action', (done) => {

    request(`http://localhost:${port}/topLevelValidationFail`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 422);
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });

  it('Should not response with the validation fail code raised by a nested action', (done) => {

    request(`http://localhost:${port}/nestedActionFail`, (err, response, body) => {

      if (err){
        return done(err);
      }

      let error = null;
      try{
        assert.equal(response.statusCode, 500);

        const result = JSON.parse(body);
        assert.equal(result, 'Internal Server Error');
      }
      catch(errr){
        error = errr;
      }

      done(error);
    });
  });
});
