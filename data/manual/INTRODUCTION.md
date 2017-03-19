## TL;DR version
- [Hello World](https://github.com/node-oca/example-hello-world)
- [REST](https://github.com/node-oca/example-rest)
- [Middleware integration](https://github.com/node-oca/example-middleware)
- [Authentication](https://github.com/node-oca/example-auth)
- [Uploads](https://github.com/node-oca/example-uploads)
- [JSON serialized actions](https://github.com/node-oca/example-json-actions)

## What is an Action ?

An action is used to implement evalutations

```javascript
const Oca = require('oca');

class MyAction extends Oca.Action{
  _perform(data){
    return Promise.resolve('hello world');
  }
}
```

[Action Documentation](https://node-oca.github.io/docs/class/src/Action.js~Action.html)

## What is an Input ?

The data used for the execution is held by inputs which are defined inside of
the Action. They are implemented with a wide range of verifications which make
sure that the value held by them meets the necessary requirements for the execution
of the action.

Oca comes bundled with the inputs types:

| Type        | Data Example |
| ------------- |-------------|
| [Bool](https://node-oca.github.io/docs/class/src/Ext/Inputs/Bool.js~Bool.html) | ```true``` |
| [Numeric](https://node-oca.github.io/docs/class/src/Ext/Inputs/Numeric.js~Numeric.html) | ```10``` |
| [Text](https://node-oca.github.io/docs/class/src/Ext/Inputs/Text.js~Text.html) | ```'Test'``` |
| [FilePath](https://node-oca.github.io/docs/class/src/Ext/Inputs/FilePath.js~FilePath.html) | ```/tmp/someFile.txt``` |
| [Url](https://node-oca.github.io/docs/class/src/Ext/Inputs/Url.js~Url.html) | ```http://www.google.com``` |
| [Email](https://node-oca.github.io/docs/class/src/Ext/Inputs/Email.js~Email.html) | ```user@domain.com``` |
| [Ip](https://node-oca.github.io/docs/class/src/Ext/Inputs/Ip.js~Ip.html) | ```192.168.0.1``` |
| [Timestamp](https://node-oca.github.io/docs/class/src/Ext/Inputs/Timestamp.js~Timestamp.html) | ```new Date()``` |
| [UUID](https://node-oca.github.io/docs/class/src/Ext/Inputs/UUID.js~UUID.html) | ```10ec58a-a0f2-4ac4-8393-c866d813b8d1```|
| [Version](https://node-oca.github.io/docs/class/src/Ext/Inputs/Version.js~Version.html) | ```0.1.12```|
| [Stream](https://node-oca.github.io/docs/class/src/Ext/Inputs/Stream.js~Stream.html) | ```new stream.Writable()```|
| [Buffer](https://node-oca.github.io/docs/class/src/Ext/Inputs/Buf.js~Buf.html) | ```new Buffer([2, 3, 4])```|
| [Any](https://node-oca.github.io/docs/class/src/Ext/Inputs/Any.js~Any.html) | ```{a: 1, b: 2}```|

> You can easily implement your own type, if you are interested take a look at
the input inplementations bundled with Oca

**Creating inputs**

Inputs are created using a [syntactic sugar](https://en.wikipedia.org/wiki/Syntactic_sugar) that describes their
name and type (aka [TypeScript](https://www.typescriptlang.org/)), for instance:

```javascript
const Oca = require('oca');

class MyAction extends Oca.Action {
  constructor(){
    super();

    this.createInput('myInput: text'); // <--- Creating an input
  }

  _perform(data){

    // using it inside of the evalutation
    const value = data.myInput;

    return Promise.resolve(`hello ${data.myInput}`);
  }
}
```

Any input can be defined as a vector by using the short array syntax `[]`:

```javascript
this.createInput('myInput: text[]');
```

Additionally, you can specify if an input is optional (not required) by adding
`?` beside of the input name:

```javascript
this.createInput('myInput?: text[]');
```

**Input properties**

Properties are used to drive the behaviour of the input, each input type has their
own set of properties

For instance, setting the minimum and maximum allowed number of characters
```javascript
this.createInput('myInput: text', {min: 8, max: 16});
```

Another example, making sure the file exists and also file size does not exceed the maximum allowed
```javascript
this.createInput('myInput: filePath', {exists: true, maxFileSize: 1024 * 1024});
```

Checkout the input documentation to know the available properties

**Custom input verifications**

You may need verifications that are very related with the action that is hosting the input. Oca
lets you to implement custom verifications for any input without having to implement a new input
type. It's done by using the extendedValidation callback.

Oca binds `this` with the input instance, so you can access all information you need as
any validation that's bundled with the input.

```javascript
const Oca = require('oca');

class CustomAction extends Oca.Action{
  constructor(){
    super();

    // the third argument can be defined as extendedValidation callback
    this.createInput('a: text', {}, function(at=null){

      // my custom validation
      console.log(this.name);

      return Promise.resolve(true);
    });
  }
}
```

[Input Documentation](https://node-oca.github.io/docs/class/src/Input.js~Input.html)

## How to execute actions ?

**Executing an action a registerd action**

```javascript
const myAction = Oca.createAction('myAction');

myAction.input('myInput').value = 'Some Text';

// executing the action
myAction.execute().then((result) => {
  console.log(result);
}).catch((err) => {
  throw err;
})
```

**Executing from Web**

First we need to tell our Action to be available through
web requests, it's done by webfying them:

```javascript

// In the registration of the action add the line bellow
Oca.webfyAction(MyAction, 'get');
```

You can enable authentication prior to the execution of any action, this is done
by webfying the action with the option ```auth=true```:

```javascript
// In the registration of the action add the line bellow
Oca.webfyAction(MyAction, 'get', {auth: true});
```

Also, you can tell if the action is visible by the restful support, by defining
a route for it ```restRoute='/api/myAction'```.

```javascript
// In the registration of the action add the line bellow
Oca.webfyAction(MyAction, 'get', {auth: true, restRoute: '/api/myAction'});
```

When an action requires auth you need to tell what is the passport
authentication that should be used for the webfied actions flagged with ```auth=true```,
this is done by adding a middleware that gets executed before the action

```javascript
const passport = require('passport');
Oca.addBeforeAuthAction(passport.authenticate('...'));
```

Alternatively a custom authentication method can be defined per handler basis, if
you are interested checkout about the [Web Handler](https://node-oca.github.io/docs/class/src/Ext/Handlers/Web.js~Web.html)


**Calling the action through middleware**

```javascript
// adding add a middleware which is going to execute the action
const app = express();
app.get('/xxx', Oca.middleware('myAction', (err, result, req, res) => {
  if (err) return next(err);
  res.send(`result: ${result}`);
}));
```

Executing it
```
https://.../xxx/myInput=test
```

**Calling the action through REST**

When webfying an action you need to define the rest route that should be used
to access the action.

```javascript
// webfying an action with support for rest requests
Oca.webfyAction(MyAction, 'get', {auth: true, restRoute: '/api/myAction'});
```

```javascript
// adding the rest support to the express app
const app = express();
app.use(Oca.restful());
```

Executing it
```
https://.../api/myAction?myInput=world
```

Oca responses the rest request using JSON following google's json style, for the example above
the response would be:
```json
{
  "data": "hello world",
  "apiVersion": "0.1.1"
}
```

**File uploads**

Uploads are fully supported, since Oca abstract the web specifics any FilePath
input that's available through an action webfied by either POST or PUT becomes
automatically an uploader field. When the action is executed the input gets
assigned with the path about where the file has been uploaded to.

**Calling actions from a serialized JSON form**

Oca lets you to postpone an action execution by baking them into JSON, it can be used for
console operations

```javascript
const myAction = Oca.createAction('myAction');
myAction.input('myInput').value = 'Text';

// serializing the action into json
actionA.toJson().then((json) => {

  // re-creating the action
  const myAction2 = Oca.Action.createActionFromJson(json);

  // executing it
  return myAction2.execute();

}).catch((err) => {
  throw err;
});
```

[JSON Action Documentation](https://node-oca.github.io/docs/class/src/Action.js~Action.html#instance-method-toJson)

## How to share data between actions ?

Oca shares data between actions using a Session, for futher
details please checkout the [Session Documentation](https://node-oca.github.io/docs/class/src/Session.js~Session.html)

## How to configure Oca ?

The basic configuration can be found under Settings, for futher
details please checkout the [Settings Documentation](https://node-oca.github.io/docs/class/src/Settings.js~Settings.html)
