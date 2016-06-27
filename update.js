'use strict';

process.on('unhandledRejection', function (e) {
    throw e;
});

const bluebird = require('bluebird');
const co = require('co');
const fs = bluebird.promisifyAll(require('fs'));
const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const sdfParser = require('sdf-parser');
const zlib = require('zlib');

const config = require('./config.json');

const getMolecule = require('./molecule').getMolecule;

const dataDir = path.join(config.data, 'Weekly');
const kHalfStringMaxLength = 268435440 / 2;

let db;
co(function*() {
    db = yield MongoClient.connect(config.mongodb);
    console.log('connected to MongoDB');

    const adminCollection = getCollection(db, 'admin');
    const dataCollection = getCollection(db, 'data');

    let progress = yield adminCollection.find({_id: 'main_progress'}).next();

    const lastDate = progress.date;
    const weeklyDirs = yield fs.readdirAsync(dataDir);

    for (const week of weeklyDirs) {
        const weekDate = new Date(week);
        if (weekDate < lastDate) continue;
        const weekDir = path.join(dataDir, week);

        // remove killed compounds
        let killed;
        try {
            const killedFile = yield fs.readFileAsync(path.join(weekDir, 'killed-CIDs'), 'ascii');
            killed = killedFile.split(/\r|\n|\r\n/).map(Number);
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }
        if (killed) {
            console.log(killed);
        }
    }

    /*const lastDocument = yield dataCollection.find({seq: {$lte: progress.seq}}).sort('_id', -1).limit(1).next();
    let firstID = lastDocument ? lastDocument._id : 0;

    const dataFiles = yield fs.readdirAsync(dataDir);
    const firstName = getNextFilename(firstID);

    const firstIndex = dataFiles.findIndex(n => n === firstName);

    if (firstIndex === -1) {
        throw new Error('file not found: ' + firstName);
    }

    console.log(`starting with file ${firstName}`);
    for (let i = firstIndex; i < dataFiles.length; i++) {
        if (!dataFiles[i].endsWith('.sdf.gz')) continue;
        console.log(`treating file ${dataFiles[i]}`);
        const gzValue = yield fs.readFileAsync(path.join(dataDir, dataFiles[i]));
        const bufferValue = zlib.gunzipSync(gzValue);
        let n = 0, nextIndex = 0;
        while (n < bufferValue.length) {
            nextIndex = bufferValue.indexOf('$$$$', n + kHalfStringMaxLength);
            if (nextIndex === -1) nextIndex = bufferValue.length;
            const strValue = bufferValue.slice(n, nextIndex).toString();
            const molecules = sdfParser(strValue).molecules;
            for (let j = 0; j < molecules.length; j++) {
                const molecule = molecules[j];
                if (molecule.PUBCHEM_COMPOUND_CID <= firstID) continue;
                const result = getMolecule(molecule);
                result.seq = ++progress.seq;
                yield dataCollection.updateOne({_id: result._id}, result, {upsert: true});
                yield adminCollection.updateOne({_id: progress._id}, progress);
            }
            n = nextIndex;
        }
    }*/
    
}).catch(function (e) {
    console.log('error');
    console.error(e);
}).then(function () {
    console.log('closing DB');
    if (db) db.close();
});

function getCollection(db, name) {
    return db.collection(name);
}

const elementsPerRange = 25000;
function getNextFilename(id) {
    const factor = Math.floor(id / elementsPerRange);
    const start = 25000 * factor + 1;
    const end = 25000 * (factor + 1);
    return `Compound_${addZeros(start)}_${addZeros(end)}.sdf.gz`;
}

function addZeros(value) {
    var str = String(value);
    return '0'.repeat(9 - str.length) + str;
}
