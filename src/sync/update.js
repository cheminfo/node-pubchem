'use strict';

process.on('unhandledRejection', function (e) {
  throw e;
});

const path = require('path');
const zlib = require('zlib');

const fs = require('fs-extra').promises;
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
  const adminCollection = await pubChemConnection.getAdminCollection();
  const collection = await pubChemConnection.getMoleculesCollection();

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
    console.log(`processing directory ${week}`);
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
          await collection.deleteOne({ _id: killedID });
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

      console.log(`processing file ${sdfFile}`);
      let newMolecules = await importOneFile(
        sdfPath,
        pubChemConnection,
        { firstID, progress }
      );
      console.log(`Added ${newMolecules} new molecules`);
    }

    progress.date = weekDate;
    lastFile = progress.file = '';
    await adminCollection.updateOne({ _id: progress._id }, progress);
  }
}
