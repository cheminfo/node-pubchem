'use strict';


const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');

const sdfParser = require('sdf-parser');

const config = require('../util/config');
const pubChemConnection = new (require('../util/PubChemConnection'))();

const improveMolecule = require('./improveMolecule');

const dataDir = path.join(config.data, 'CURRENT-Full/SDF');
const kHalfStringMaxLength = 268435440 / 2;

firstImport().catch(function (e) {
  console.log('error');
  console.error(e);
}).then(function () {
  console.log('closing DB');
  pubChemConnection.close();
});

async function firstImport() {
  let db = await pubChemConnection.getDatabase();
  console.log('connected to MongoDB');

  const adminCollection = db.collection('admin');
  const dataCollection = db.collection('data');

  let progress = await adminCollection.find({ _id: 'main_progress' }).next();
  if (progress === null) {
    progress = {
      _id: 'main_progress',
      state: 'import',
      seq: 0,
      date: new Date()
    };
    await adminCollection.insertOne(progress);
  }

  const lastDocument = await dataCollection.find({ seq: { $lte: progress.seq } }).sort('_id', -1).limit(1).next();
  let firstID = lastDocument ? lastDocument._id : 0;

  const dataFiles = await fs.readdir(dataDir);
  const firstName = getNextFilename(firstID);

  const firstIndex = dataFiles.findIndex((n) => n === firstName);

  if (firstIndex === -1) {
    throw new Error(`file not found: ${firstName}`);
  }

  console.log(`starting with file ${firstName}`);
  for (let i = firstIndex; i < dataFiles.length; i++) {
    if (!dataFiles[i].endsWith('.sdf.gz')) continue;
    console.log(`treating file ${dataFiles[i]}`);
    const gzValue = await fs.readFile(path.join(dataDir, dataFiles[i]));
    const bufferValue = zlib.gunzipSync(gzValue);
    let n = 0;
    let nextIndex = 0;
    while (n < bufferValue.length) {
      nextIndex = bufferValue.indexOf('$$$$', n + kHalfStringMaxLength);
      if (nextIndex === -1) nextIndex = bufferValue.length;
      const strValue = bufferValue.slice(n, nextIndex).toString();
      const molecules = sdfParser(strValue).molecules;
      for (let j = 0; j < molecules.length; j++) {
        const molecule = molecules[j];
        if (molecule.PUBCHEM_COMPOUND_CID <= firstID) continue;
        const result = improveMolecule(molecule);
        result.seq = ++progress.seq;
        await dataCollection.updateOne({ _id: result._id }, { $set: result }, { upsert: true });
        await adminCollection.updateOne({ _id: progress._id }, { $set: progress });
      }
      n = nextIndex;
    }
  }

  progress.state = 'update';
  await adminCollection.updateOne({ _id: progress._id }, progress);
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
