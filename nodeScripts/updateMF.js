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
    const cursor = collection.find();
    while (yield cursor.hasNext()) {
        if (done % 100000 === 0) {
            console.log(done);
        }
        const doc = yield cursor.next();
        const mol = OCLE.Molecule.fromIDCode(doc.ocl.id);
        const mf = mol.getMF().parts.join('.');

        const toSet = {
            mf: mf
        };

        try {
            const chemcalcMF = chemcalc.analyseMF(mf);
            toSet.em = chemcalcMF.em;
            toSet.mw= chemcalcMF.mw;
            toSet.unsat= chemcalcMF.unsaturation;
            toSet.charge= chemcalcMF.charge;
            toSet.atom= mfUtil.getAtoms(chemcalcMF);
        } catch (e) {
            console.log(e,mf);
        }

        yield collection.findOneAndUpdate({
            _id: doc._id
        }, {
            $set: toSet
        });
        done++;
    }
}).catch(function (e) {
    console.log('error');
    console.error(e);
}).then(function () {
    console.log('closing DB');
    if (db) db.close();
});
