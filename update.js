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
        if (weekDate <= lastDate) continue;
        console.log(`treating directory ${week}`);
        const weekDir = path.join(dataDir, week);

        // remove killed compounds
        let killed;
        try {
            const killedFile = yield fs.readFileAsync(path.join(weekDir, 'killed-CIDs'), 'ascii');
            killed = killedFile.split(/\r\n|\r|\n/).map(Number);
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }
        if (killed) {
            console.log(`removing ${killed.length} killed IDs`);
            for (const killedID of killed) {
                yield dataCollection.deleteOne({_id: killedID});
            }
        }

        // insert new or updated compounds
        const sdfDir = path.join(weekDir, 'SDF');
        const sdfList = yield fs.readdirAsync(sdfDir);
        for (const sdfFile of sdfList) {
            if (!sdfFile.endsWith('.sdf.gz')) continue;
            const sdfPath = path.join(sdfDir, sdfFile);
            console.log(`treating file ${sdfFile}`);
            const gzValue = yield fs.readFileAsync(sdfPath);
            const bufferValue = zlib.gunzipSync(gzValue);
            let n = 0, nextIndex = 0;
            while (n < bufferValue.length) {
                nextIndex = bufferValue.indexOf('$$$$', n + kHalfStringMaxLength);
                if (nextIndex === -1) nextIndex = bufferValue.length;
                const strValue = bufferValue.slice(n, nextIndex).toString();
                const molecules = sdfParser(strValue).molecules;
                for (let j = 0; j < molecules.length; j++) {
                    const molecule = molecules[j];
                    const result = getMolecule(molecule);
                    result.seq = ++progress.seq;
                    yield dataCollection.updateOne({_id: result._id}, result, {upsert: true});
                    yield adminCollection.updateOne({_id: progress._id}, progress);
                }
                n = nextIndex;
            }
        }

        progress.date = weekDate;
        yield adminCollection.updateOne({_id: progress._id}, progress);
    }
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
