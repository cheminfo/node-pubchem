'use strict';

process.on('unhandledRejection', function (e) {
    throw e;
});

const bluebird = require('bluebird');
const co = require('co');
const limit=10;
const mongo = require('../src/node_modules/mongo');

let db;
let done = 0;
co(function*() {
    db = yield mongo.connect();
    console.log('connected to MongoDB');
    const collection = db.collection('data');
    const cursor = collection.find({
        charge: 0,
        nbFragments: 1,
        mf: {$regex:/^C[0-9]*H[0-9]*F?[0-9]*N?[0-9]*O?[0-9]*S?[0-9]*$/}
    }).limit(limit);
    while (yield cursor.hasNext()) {
        const doc = yield cursor.next();
        const mf=doc.mf;

        if (done % 1000 === 0) {
            console.log(new Date(), done,'- Current _id:',doc._id);
        }

        done++;

        console.log(doc);

    }
}).catch(function (e) {
    console.log('error');
    console.log(e);
    console.error(e);
}).then(function () {
    console.log('closing DB');
    if (db) db.close();
});
