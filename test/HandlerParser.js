const assert = require('assert');
const Oca = require('../src');
const testutils = require('../testutils');

const HandlerParser = Oca.HandlerParser;
const Session = Oca.Session;


describe('HandlerParser:', () => {

  class CustomParser extends HandlerParser{
    async _perform(inputList){
      const result = {};

      for (const input of inputList){
        result[input.name] = input.value;
      }

      return result;
    }
  }

  it('Should parse the action input values', () => {
    return (async () => {

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.session = new Session();

      action.input('a').value = 'text';
      action.input('b').value = 20;

      const parser = new CustomParser(action);
      const inputValues = await parser.parseInputValues();

      // testing the result of the action
      assert.equal(inputValues.a, action.input('a').value);
      assert.equal(inputValues.b, action.input('b').value);

    })();
  });

  it('Should not replace a previous assigned value in the autofill', () => {
    return (async () => {

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.input('a').assignProperty('autofill', 'text');
      action.input('b').assignProperty('autofill', 'number');
      action.session = new Session();
      action.session.autofill.text = 'keepIt';

      action.input('a').value = 'text';
      action.input('b').value = 20;

      const parser = new CustomParser(action);

      const autofillValues = await parser.parseAutofillValues();

      // testing the result of the action
      assert(!('text' in autofillValues));
      assert.equal(autofillValues.number, action.input('b').value);

    })();
  });

  it('Should fail to execute a non implemented parser', (done) => {
    (async () => {

      const action = new testutils.Actions.Shared.PlainObjectResult();
      action.session = new Session();
      action.session.autofill.text = 'keepIt';

      action.input('a').value = 'text';
      action.input('b').value = 20;

      const parser = new HandlerParser(action);
      await parser.parseAutofillValues();

    })().then((result) => {
      done(new Error('Unexpected result'));
    }).catch((err) => {
      done(err.message === 'Not implemented' ? null : err);
    });
  });
});
