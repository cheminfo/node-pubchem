'use strict';

const program = require('commander');
const pkg = require('../package.json');

program
    .version(pkg.version)
    .command('download', 'download the complete current database')
    .parse(process.argv);
