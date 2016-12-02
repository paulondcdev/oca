const assert = require('assert');
const Oca = require('../../../src');

const Input = Oca.Input;


describe('Ip Input:', () => {

  it('Input should start empty', () => {
    const input = Input.create('input: ip');
    assert.equal(input.value, null);
  });

  it('Ip address value version 4 should be accepted', (done) => {
    const input = Input.create('input: ip');
    input.value = '127.0.0.1';

    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Ip address value version 6 should be accepted', (done) => {
    const input = Input.create('input: ip');
    input.value = '::ffff:127.0.0.1';

    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Invalid Ip address value should be rejected', (done) => {
    const input = Input.create('input: ip');
    input.value = '127.0.0.1.366';

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done();
    });
  });

  it('Should test if the ip is private', () => {
    const input = Input.create('input: ip');

    input.value = '127.0.0.1';
    assert(input.isPrivate());

    input.value = '75.157.10.26';
    assert(!input.isPrivate());
  });

  it('Should only allow ipv4', (done) => {
    const input = Input.create('input: ip', {allowV6: false});
    input.value = '127.0.0.1';

    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });

  it('Should fail when only ipv4 is allowed (ip carries a ipv6 value)', (done) => {
    const input = Input.create('input: ip', {allowV6: false});
    input.value = '::ffff:127.0.0.1';

    input.validate.bind(input)().then((value) => {
      done(new Error('unexpected value'));
    }).catch((err) => {
      done((err.message === 'Invalid ip!') ? null : new Error('unexpected value'));
    });
  });

  it('Should allow ipv6', (done) => {
    const input = Input.create('input: ip', {allowV6: true});
    input.value = '::ffff:127.0.0.1';

    input.validate.bind(input)().then((value) => {
      done();
    }).catch((err) => {
      done(err);
    });
  });
});
