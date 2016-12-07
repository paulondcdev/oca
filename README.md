<p align="center">
  <img src="data/logo.png"/>
</p>

[![Gitter chat](https://badges.gitter.im/node-oca/gitter.png)](https://gitter.im/node-oca)
[![Build Status](https://travis-ci.org/node-oca/oca.svg?branch=master)](https://travis-ci.org/node-oca/oca)
[![codecov.io](https://codecov.io/github/node-oca/oca/coverage.svg?branch=master)](https://codecov.io/github/node-oca/oca?branch=master)
[![Esdocs](https://node-oca.github.io/badge.svg)](https://node-oca.github.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/node-oca/oca/badge.svg)](https://snyk.io/test/github/node-oca/oca)
</p>

Oca is a framework focused to build solid evaluations which can be triggered from many different forms where you write the code once and Oca takes care about the specifics that are necessary to run the evaluation, such as by web middlewares, REST requests, JSON serialized actions.

One of the main concepts behind this framework is to provide a solid platform to write realiable evaluations that developers can easily express the requirement to execute evaluations in a way that is fairly extendable and comprehensible. By doing that it reduces the need of repetitive tedeus routines ([DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)) that can both pollute and make the code less modular.

<p align="center">
  <img src="data/ocaHi.png"/>
</p>

[<img src="data/intro.png"/>](https://github.com/node-oca/oca/blob/master/data/manual/INTRODUCTION.md)

## Key features
- Flexible architeture
- Agnostic execution platform
- Integrated caching system
- Express integration
- Authentication integration through passport
- Full file upload support
- Middleware actions
- Auto RESTful support
- JSON serialized actions

## Documentation
- [API Documentation](https://node-oca.github.io)
- Full Examples
 - [Hello World](https://github.com/node-oca/example-hello-world)
 - [REST](https://github.com/node-oca/example-rest)
 - [Middleware integration](https://github.com/node-oca/example-middleware)
 - [Authentication](https://github.com/node-oca/example-auth)
 - [Uploads](https://github.com/node-oca/example-uploads)
 - [JSON serialized actions](https://github.com/node-oca/example-json-actions)
- Tutorials (coming soon)

## Requirement
[<img src="data/nodejs.png"/>](https://www.nodejs.org)

Oca is built using modern specs [ES6](http://es6-features.org/)/ES7, it requires [Node.js](https://www.nodejs.org) version **6 or greater**

## Install
```
npm install oca --save
```

## Getting help
Use the GitHub issues for tracking bugs and feature requests Also, feel free to talk about Oca at:
- Gitter [node-oca](https://gitter.im/node-oca)
- IRC #node-oca on [freenode](http://irc.lc/freenode/node-oca)

## Issues
Oca development discussions and bug reports are collected on [Issues](https://github.com/node-oca/oca/issues)

## Contributing
Contributions are welcome to Oca. It can be made through many different forms depending on your level of interest:
- Participating in gitter/irc discussions
- Proposing features
- Reporting issues
- Making improvements (adding new features, improving the existing features, adding tests,
adding examples, clarifying wording and fixing errors)

## Acknowledgements
Oca was heavily inspired by concepts found in the technologies below:
- [Passport](https://github.com/jaredhanson/passport)
- [Cortex](https://github.com/ImageEngine/cortex)
- [Express](http://expressjs.com)

## Licensing
Oca is free software; you can redistribute it and/or modify it under the terms of the MIT License
