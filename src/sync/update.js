'use strict';

process.on('unhandledRejection', function (e) {
  throw e;
});

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');

const sdfParser = require('sdf-parser');


const config = require('../util/config');
const pubChemConnection = new (require('../util/PubChemConnection'))();

const improveMolecule = require('./improveMolecule');

const dataDir = path.join(config.data, 'Weekly');
const kHalfStringMaxLength = 268435440 / 2;


update().catch(function (e) {
  console.log('error');
  console.error(e);
}).then(function () {
  console.log('closing DB');
  if (pubChemConnection) pubChemConnection.close();
});

async function update() {
  var db = await pubChemConnection.getDatabase();
  console.log('connected to MongoDB');

  const adminCollection = db.collection('admin');
  const dataCollection = db.collection('data');

  let progress = await adminCollection.find({ _id: 'main_progress' }).next();
  if (!progress || progress.state !== 'update') {
    throw new Error('run import first');
  }

  let lastFile = progress.file || '';
  const lastDate = progress.date;
  const weeklyDirs = await fs.readdir(dataDir);

  for (const week of weeklyDirs) {
    const weekDate = new Date(week);
    if (weekDate <= lastDate) continue;
    console.log(`treating directory ${week}`);
    const weekDir = path.join(dataDir, week);

    // remove killed compounds
    if (!lastFile) {
      let killed;
      try {
        const killedFile = await fs.readFile(path.join(weekDir, 'killed-CIDs'), 'ascii');
        killed = killedFile.split(/\r\n|\r|\n/).map(Number);
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      if (killed) {
        console.log(`removing ${killed.length} killed IDs`);
        for (const killedID of killed) {
          await dataCollection.deleteOne({ _id: killedID });
        }
      }
    }

    // insert new or updated compounds
    const sdfDir = path.join(weekDir, 'SDF');
    const sdfList = await fs.readdir(sdfDir);
    for (const sdfFile of sdfList) {
      if (!sdfFile.endsWith('.sdf.gz')) continue;
      if (lastFile && lastFile >= sdfFile) continue;
      const sdfPath = path.join(sdfDir, sdfFile);
      console.log(`treating file ${sdfFile}`);
      const gzValue = await fs.readFile(sdfPath);
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
          const result = improveMolecule(molecule);
          result.seq = ++progress.seq;
          await dataCollection.updateOne({ _id: result._id }, { $set: result }, { upsert: true });
          await adminCollection.updateOne({ _id: progress._id }, { $set: progress });
        }
        n = nextIndex;
      }
      progress.file = sdfFile;
      await adminCollection.updateOne({ _id: progress._id }, progress);
    }

    progress.date = weekDate;
    lastFile = progress.file = '';
    await adminCollection.updateOne({ _id: progress._id }, progress);
  }
}
