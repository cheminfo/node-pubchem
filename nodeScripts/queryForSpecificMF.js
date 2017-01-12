'use strict';

process.on('unhandledRejection', function (e) {
    throw e;
});

const bluebird = require('bluebird');
const co = require('co');
const OCLE = require('openchemlib-extended');
const chemcalc = require('chemcalc');
const mfUtil = require('../src/node_modules/mf');

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
        mf: {$regex:/^C[0-9]*H[0-9]*F?[0-9]*N?[0-9]*O?[0-9]*S?[0-9]*$/},
        "mf.atom.C": {$lt: 8}
    }).limit(10000000);
    while (yield cursor.hasNext()) {
        const doc = yield cursor.next();
        const mf=doc.mf;
        const total=(doc.atom.C||0)+(doc.atom.F||0)+(doc.atom.N||0)+(doc.atom.O||0)+(doc.atom.S||0);

        if (done % 1000 === 0) {
            console.log(new Date(), done,'- Current _id:',doc._id);
            console.log(mf, total);
        }

        done++;
        
        
        if (total>8) continue;
        const mol = OCLE.Molecule.fromIDCode(doc.ocl.id, doc.ocl.coord);
        const smiles=mol.toSmiles();
        console.log(mf+'\t'+total+'\t'+smiles);
        


        
    }
}).catch(function (e) {
    console.log('error');
    console.log(e);
    console.error(e);
}).then(function () {
    console.log('closing DB');
    if (db) db.close();
});
