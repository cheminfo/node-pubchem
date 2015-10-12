'use strict';

const co = require('co');
const debug = require('debug')('pc:download');
const FTP = require('./ftp');
const mkdirp = require('mkdirp-promise');
const path = require('path');
const program = require('commander');

program
    .option('-d --directory [dir]', 'Directory', 'data')
    .parse(process.argv);

const dataDir = path.resolve(process.cwd(), program.directory);
const gzDir = path.join(dataDir, 'gz');

let ftp;

function* download() {
    debug('gzDir: ' + dataDir);
    yield mkdirp(gzDir);

    ftp = new FTP();
    yield ftp.connect();
    yield ftp.cwdFull();

    const files = (yield ftp.list()).slice(0, 6); // todo remove
    for (let i = 0; i < files.length; i++) {
        yield ftp.save(files[i], path.join(gzDir, files[i]));
    }
}

co(download).then(function () {
    console.log('finished');
}, function (e) {
    console.error('error', e);
}).then(function () {
    return ftp.close();
});
