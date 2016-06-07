'use strict';

process.on('unhandledRejection', function (e) {
    throw e;
});

const bluebird = require('bluebird');
const co = require('co');
const fs = bluebird.promisifyAll(require('fs'));
const MongoClient = require('mongodb').MongoClient;
const OCL = require('openchemlib');
const path = require('path');
const sdfParser = require('sdf-parser');
const zlib = require('zlib');

const config = require('./config.json');

const dataDir = config.data;

let db;
co(function*() {
    db = yield MongoClient.connect(config.mongodb);
    console.log('connected to MongoDB');

    const adminCollection = getCollection(db, 'admin');
    const dataCollection = getCollection(db, 'data');

    let progress = yield adminCollection.find().limit(1).next();
    if (progress === null) {
        progress = {
            _id: 'progress',
            lastID: 0,
            date: new Date()
        };
        yield adminCollection.insertOne(progress);
    }

    const dataFiles = yield fs.readdirAsync(dataDir);
    const firstName = getNextFilename(progress.lastID);

    const firstIndex = dataFiles.findIndex(n => n === firstName);

    if (firstIndex === -1) {
        throw new Error('file not found: ' + firstName);
    }

    console.log(`starting with file ${firstName}`);
    for (let i = firstIndex; i < dataFiles.length; i++) {
        console.log(`treating file ${dataFiles[i]}`);
        const gzValue = yield fs.readFileAsync(path.join(dataDir, dataFiles[i]));
        const strValue = zlib.gunzipSync(gzValue).toString();
        const molecules = sdfParser(strValue).molecules;
        for (let j = 0; j < molecules.length; j++) {
            const molecule = molecules[j];
            if (molecule.PUBCHEM_COMPOUND_CID <= progress.lastID) continue;
            const oclMol = OCL.Molecule.fromMolfile(molecule.molfile);
            const oclID = oclMol.getIDCodeAndCoordinates();
            const result = {
                _id: +molecule.PUBCHEM_COMPOUND_CID,
                ocl: {
                    id: oclID.idCode,
                    coord: oclID.coordinates
                },
                inchi: molecule.PUBCHEM_IUPAC_INCHI,
                inchiKey: molecule.PUBCHEM_IUPAC_INCHIKEY,
                iupac: molecule.PUBCHEM_IUPAC_NAME,
                mf: molecule.PUBCHEM_MOLECULAR_FORMULA,
                em: molecule.PUBCHEM_EXACT_MASS,
                mw: molecule.PUBCHEM_MOLECULAR_WEIGHT
            };
            yield dataCollection.insertOne(result);
            progress.lastID = result._id;
            yield adminCollection.updateOne({_id: progress._id}, progress);
        }
    }
    
    db.close();
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
