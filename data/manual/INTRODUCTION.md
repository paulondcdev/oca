## Actions & Providers

By writting evalutations using Oca API they can be triggered from many different forms. For
instance the code bellow can be executed from web middlewares, rest, json serialized
where the evaluation does not need to deal with the specifics of each form.

**Action**

```javascript
const Oca = require('oca');

class MyAction extends Oca.Action{
  constructor(){
    super();
    this.createInput('someInput: text');
  }

  _perform(){
    const value = this.input('someInput').value;
    return Promise.resolve(`hello ${value}`);
  }
}
```

An action is always available through a provider. It's used to group actions that
are about the same context. For instance, `User Profile`, `User Friends`, `User Posts`
are part of the `User` provider

**Provider**

```javascript
const Oca = require('oca');

class SandBox extends Oca.Provider{}

// registering provider
Oca.registerProvider(SandBox);

// registering the action for the provider
Oca.registerAction(SandBox, MyAction);
```

**Initialization**

Always initialize Oca during the initialization of your app, it
loads the configuration that's going to be used during execution of your application

```javascript
Oca.initialize();
```

**Calling the action from a provider**

```javascript
const sandBox = Oca.createProvider('SandBox', new Oca.Session());
const myAction = sandBox.createAction('MyAction');

myAction.input('someInput').value = 'Some Text';

// executing the action
myAction.execute().then((result) => {
  console.log(result);
}).catch((err) => {
  throw err;
})
```

**Web support**

First we need to tell that our Provider and Action can be available through
web requests, it's done by webfying them:

```javascript
// In the registration of the provider add the line bellow
Oca.webfyProvider(SandBox, {restRoute: '/SomeWhere'})

// In the registration of the action add the line bellow
Oca.webfyAction(SandBox, MyAction, Oca.Method.Get);
```

You can enable authorization prior to the execution of any action, this is done
by webfying the action with the option ```auth=true```:

```javascript
// In the registration of the action add the line bellow
Oca.webfyAction(SandBox, MyAction, Oca.Method.Get, {auth: true});
```

When an action requires auth you also need to specify the passport
authentication under the Oca's settings

```javascript
const passport = require('passport');
Oca.Settings.authenticate = passport.authenticate('...')
```

Alternatively a custom authentication method can be defined per provider basis, if
you are interested checkout about the RequestHandler

**Convenient Form uploads**

File uploads are fully supported, since Oca abstract the web specifics any FilePath
input that's available through an action webfied by either POST or PUT becomes
automatically an uploader field. The input gets assigned with the file path about where
the file has been uploaded to.

**Calling the action through middleware**

```javascript
// adding add a middleware which is going to execute the action
const app = express();
app.get('/myAction', Oca.middleware('SandBox/MyAction', (err, result, req, res) => {
  if (err) return next(err);
  res.send(`result: ${result}`);
}));
```

Executing it
```
https://.../myAction/someInput=test
```

**Calling the action through REST**

```javascript
// adding the rest support to the express app
const app = express();
app.use(Oca.restful());;
```

Executing it
```
https://.../SandBox/MyAction/someInput=test
```

**Calling actions from a serialized JSON form**

```javascript
const sandBox = Oca.createProvider('SandBox', new Session());
const myAction = sandBox.createAction('MyAction');
myAction.input('someInput').value = 'Text';

// serializing the action into json
actionA.toJson().then((json) => {

  // re-creating the action
  const myAction2 = Oca.Provider.createActionFromJson(json);

  // executing it
  return myAction2.execute();

}).catch((err) => {
  throw err;
});
```

## Inputs

The data used for the execution is held by inputs which are defined inside of
the Action. The inputs are implemented with verifications which make
sure that the value held by them meets the necessary requirements for the execution
of the action.

Oca comes bundled with a wide range of inputs

| Type        | Data Example |
| ------------- |-------------|
| Bool | ```true``` |
| Email | ```user@domain.com``` |
| FilePath | ```/tmp/someFile.txt``` |
| Ip | ```192.168.0.1``` |
| Numeric | ```10``` |
| Text | ```'Test'``` |
| Timestamp | ```new Date()``` |
| Url | ```http://www.google.com``` |
| UUID | ```10ec58a-a0f2-4ac4-8393-c866d813b8d1```|
| Version | ```0.1.12```|
| Any | ```{a: 1, b: 2}```|

Also you can easily implement your own type

```javascript
const Oca = require('oca');

class Abc extends Oca.Input{
  _validation(at=null){
    // performs the validations for your custom type
    // ...
  }
}

// registering input
Oca.Input.registerInput(Abc, 'abc');
```

**Creating inputs**

Inputs are created using a [syntactic sugar](https://en.wikipedia.org/wiki/Syntactic_sugar) that describes its name and type (aka [TypeScript](https://www.typescriptlang.org/)), for instance:

```javascript
Oca.Input.create('myInput: bool')
```

Any input can be defined as a vector by using the short array syntax `[]`:

```javascript
Oca.Input.create('myInput: bool[]')
```

Additionally, you can specify if an input is optional (not required) by adding
`?` beside of the input name:

```javascript
Oca.Input.create('myInput?: bool[]')
```

**Properties**

Properties are used to drive the validations, each input type has their
own set of properties

For instance, setting the minimum and maximum allowed number of characters
```javascript
Oca.Input.create('myInput: text', {min: 8, max: 16});
```

Another example, making sure the file exists and also file size does not exceed the maximum allowed
```javascript
Oca.Input.create('myInput: filePath', {exists: true, maxFileSize: 1024 * 1024});
```

Checkout the input documentation to know the available properties

**Extending input verifications**

You may need verifications that are very related with the action that is hosting them. Oca
lets you to implement custom verifications for any input without having to implement a new input
type. It's done by using the extendedValidation callback.

Oca binds `this` with the input instance, so you can access all information you need as
any validation that's bundled with the input.

```javascript
const Oca = require('oca');

class CustomAction extends Oca.Action{
  constructor(){
    super();
    this.createInput('a: text', {}, function(at=null){

      // my custom validation
      console.log(this.name);

      return Promise.resolve(true);
    });
  }
}
```

## Sharing Data

Oca shares data between providers and actions using a Session, for futher
details please checkout the Session Documentation

## Configuring Oca

The basic configuring can be found under Settings, for futher
details please checkout the Settings Documentation

## Caching

Oca provides out of the box caching system that can be enabled for any action

**Making an action cacheable:**

```javascript
const Oca = require('oca');

class Hello extends Oca.Action{
  constructor(){
    super();
    this.createInput('what: text');
  }

  _cacheable(){
    // Flags the action can be cacheable
    return true;
  }

  _perform(){
    // printing how many times the execution is called
    Hello.counter += 1;
    console.log(`Called: ${Hello.counter}`);

    const value = this.input('what').value;
    return Promise.resolve(`hello ${value} ${this._counter}`);
  }
}
Hello.counter = 0;

// Registering the action
Oca.registerAction(SandBox, Hello);

// creating the action
const sandBox = Oca.createProvider('SandBox', new Session());

// creating action
const hello = sandBox.createAction('Hello');

// configuring inputs
hello.input('what').value = 'World';

// executing action twice, you should see just a single print about the counter
hello.execute().then((result) => {
  // creating the same action again, this time it should return the value from
  // the cache
  const hello2 = sandBox.createAction('Hello');
  hello2.input('what').value = 'World';
  return hello2.execute();
}).catch((err) => {
  throw err;
});
```

**Input Level caching**

 In case of nested actions where an input value passes around from one action to another one, Oca provides a caching at the input level as well, avoiding the overhead of computing the same information
 used by the validations over and over again

```javascript
const Oca = require('oca');

class DownloadLink extends Oca.Action{
  constructor(){
    super();
    // telling that the input file must exists, otherwise
    // this action can't be executed
    this.createInput('link: url', {exists: true});
  }

  _perform(){
    // creating a provider that contains the file operation actions
    const fileOperation = Oca.createProvider('FileOperation', this.session);

    // creating the checksum action
    const downloadAction = fileOperation.createAction('Download');

    // transfering the value, same as if it would be done as:
    // downloadAction.input('inputUrl').value = this.input('link').value;
    // Also, transfering any computed data from someFile to
    // filePath input. By doing that it avoids to stat the file again,
    // since that computation was already done by
    // the someFile input (through 'exists' property)
    downloadAction.input('inputUrl').setupFrom(this.input('link'));

    // returns an object containing the hash and file
    return downloadAction.execute().then((filePath) => {
      const checksumAction = fileOperation.createAction('Checksum');
      checksumAction.input('file').value = filePath;

      // final result
      return checksumAction.execute().then((checksum) => {
        return {hash: checksum, file: filePath}
      });
    });
  }
}

// Registering the action
Oca.registerAction(SandBox, DownloadLink);

// creating the action
const sandBox = Oca.createProvider('SandBox', new Session());
const downloadLink = sandBox.createAction('DownloadLink');

// setting the input (google's logo)
downloadLink.input('link').value = 'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png';

// executing action
downloadLink.execute().then((result) => {
  console.log(result);
}).catch((err) => {
  throw err;
});
```
