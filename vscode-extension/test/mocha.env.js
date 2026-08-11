// Mocha bootstrap: point ts-node at the test tsconfig before loading.
'use strict';

const path = require('path');

process.env.TS_NODE_PROJECT = path.join(__dirname, '..', 'tsconfig.test.json');
require('ts-node/register');
