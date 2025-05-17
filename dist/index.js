'use strict';

// Main plugin entry point for the compiled version
const admin = require('./admin');
const server = require('./server');

module.exports = {
  admin,
  server
};