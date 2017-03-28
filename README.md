<p align="center">
  <img src="https://node-oca.github.io/docs/data/logo.png"/>
</p>

![status](https://node-oca.github.io/docs/data/status.svg)
[![Gitter chat](https://badges.gitter.im/node-oca/gitter.png)](https://gitter.im/node-oca)
[![Build Status](https://travis-ci.org/node-oca/oca.svg?branch=master)](https://travis-ci.org/node-oca/oca)
[![Known Vulnerabilities](https://snyk.io/test/github/node-oca/oca/badge.svg)](https://snyk.io/test/github/node-oca/oca)
[![codecov.io](https://codecov.io/github/node-oca/oca/coverage.svg?branch=master)](https://codecov.io/github/node-oca/oca?branch=master)
[![Esdocs](https://node-oca.github.io/badge.svg)](https://node-oca.github.io/)
</p>

### What is it ?

Oca is a framework designed to help building apps across multiple domains. You can
use it to build any kind of application whether web based or desktop ones.

### How does it work ?

It works by providing an interface focused to describe evaluations in a way that is fairly extendable and comprehensible through a process that minimize repetitive thedeus routines  ([DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)) and produces a more versatile code base.

These evaluations can be triggered across multiple domains you write once and Oca takes care about the specifics that are necessary to run the evaluation.

<p align="center">
  <img src="https://node-oca.github.io/docs/data/ocaHi.png"/>
</p>

## Key features
- **Flexible architeture**. Oca can be integrated to any existing application. Also, it's designed from ground up to be customizable and extendable

- **Reliable executions**. Oca enforces quality control over the data used in the evaluations by performing a wide range of verifications

- **Agnostic execution platform**. Evaluations in Oca can be executed across multiple domains

- **Integrated caching system**. Oca provides out-the-box integrated caching system that can be easily enabled for any evaluation, speeding up your application

- **Express integration**. The web support from Oca is done using express, embracing the most popular web framework for Node.js

- **RESTful support**. Evaluations can be executed through REST automatically

- **Console support**. By using Oca your evaluations can be executed through command-line interfaces following docopt specifications.

[<img src="https://node-oca.github.io/docs/data/intro.png"/>](data/manual/INTRODUCTION.md)

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
[<img src="https://node-oca.github.io/docs/data/nodejs.png"/>](https://www.nodejs.org)

Oca is built using modern specs ES6/ES7, it requires [Node.js](https://www.nodejs.org) version **6** or **greater**

## Install
```
npm install oca --save
```

## Getting help
Use the GitHub issues for tracking bugs and feature requests. Also, feel free to talk about Oca at:
- Gitter [node-oca](https://gitter.im/node-oca)

## Issues
Oca development discussions and bug reports are collected on [Issues](https://github.com/node-oca/oca/issues)

## Contributing
Contributions are welcome to Oca. It can be made through many different forms depending on your level of interest:
- Participating in gitter discussions
- Proposing features
- Reporting issues
- Making improvements (adding new features, improving the existing features, adding tests,
adding testutils, clarifying wording and fixing errors)

## Acknowledgements
Oca was inspired by:
- [Cortex](https://github.com/ImageEngine/cortex)
- [Passport](https://github.com/jaredhanson/passport)
- [Express](http://expressjs.com)
- [Docopt](http://docopt.org)
- [Nujabes](https://www.youtube.com/watch?v=WrO9PTpuSSs)

## Licensing
Oca is free software; you can redistribute it and/or modify it under the terms of the MIT License
