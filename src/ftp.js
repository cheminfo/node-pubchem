'use strict';

const debug = require('debug')('pc:ftp');
const FTP = require('ftp');
const fs = require('fs');

const host = 'ftp.ncbi.nlm.nih.gov';
const current = '/pubchem/Compound/CURRENT-Full/SDF/';
const daily = '/pubchem/Compound/Daily/';
const weekly = '/pubchem/Compound/Weekly/';
const monthly = '/pubchem/Compound/Monthly/';

class FTPWrapper {
    constructor(ftp) {
        this.ftp = new FTP();
        this.ftp.on('error', e => {
            debug('error', e);
            this.error(e);
        });
        this.ftp.on('ready', () => {
            debug('ready');
            this._onConnect();
        });
        this.ftp.on('close', () => {
            debug('close');
            this._onClose();
        })
    }

    connect() {
        return new Promise(resolve => {
            this._onConnect = resolve;
            this.ftp.connect({host});
        });
    }

    close() {
        return new Promise(resolve => {
            this._onClose = resolve;
            this.ftp.end();
        });
    }

    cwdFull() {
        return new Promise((resolve, reject) => {
            debug('cwd to ' + current);
            this.ftp.cwd(current, err => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    list() {
        return new Promise((resolve, reject) => {
            debug('get file list');
            this.ftp.list((err, list) => {
                if (err) return reject(err);
                list = list
                    .filter(o => o.type === '-' && o.name.startsWith('Compound_'))
                    .map(o => o.name);
                debug(list.length + ' files');
                resolve(list);
            });
        });
    }

    save(file, destination) {
        return new Promise((resolve, reject) => {
            debug('download ' + file);
            this.ftp.get(file, function (err, stream) {
                if (err) return reject(err);
                debug('write to disk');
                const ws = fs.createWriteStream(destination);
                ws.on('error', reject);
                ws.on('finish', resolve);
                stream.pipe(ws);
            });
        });
    }
}

module.exports = FTPWrapper;
