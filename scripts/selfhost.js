#!/usr/bin/env node
const path = require('path');
process.env.SERVE_FRONTEND = '1';
process.chdir(path.join(__dirname, '..', 'backend'));
require('./server.js');
