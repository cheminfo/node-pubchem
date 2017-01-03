'use strict';

process.on('unhandledRejection', function (e) {
    throw e;
});

const bluebird = require('bluebird');
const co = require('co');
const OCL = require('openchemlib-extended');

const mongo = require('../src/node_modules/mongo');
const fragmentContainer = new Array(1024);

let db;
let done = 0;
co(function*() {
    db = yield mongo.connect();
    console.log('connected to MongoDB');
    const collection = db.collection('data');
    const cursor = collection.find();
    while (yield cursor.hasNext()) {
        if (done % 100000 === 0) {
            console.log(done);
        }
        const doc = yield cursor.next();
        if (!('nbFragments' in doc)) {
            const mol = OCL.Molecule.fromIDCode(doc.ocl.id);
            const nbFragments = mol.getFragmentNumbers(fragmentContainer, false);
            yield collection.findOneAndUpdate({
                _id: doc._id
            }, {
                $set: {nbFragments: nbFragments}
            });
        }
        done++;
    }
}).catch(function (e) {
    console.log('error');
    console.error(e);
}).then(function () {
    console.log('closing DB');
    if (db) db.close();
});
