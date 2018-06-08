'use strict';

const pubChemConnection = new (require('../util/PubChemConnection'))();


module.exports = async function () {
  return commonMFs(pubChemConnection)
    .catch((e) => console.log(e))
    .then((result) => {
      console.log('Done');
      pubChemConnection.close();
    });
};

async function commonMFs(pubChemConnection) {
  const collection = await pubChemConnection.getMoleculesCollection();
  console.log('commonMFs: Need to aggregate', await collection.count(), 'entries');
  let result = await collection.aggregate([
  //    { $limit: 1e4 },
    { $match: { nbFragments: 1, charge: 0 } }, // we don't want charges in MF
    { $group:
        {
          _id: '$mf', count: { $sum: 1 },
          em: { $first: '$em' },
          unsaturation: { $first: '$unsaturation' },
          atom: { $first: '$atom' },
          total: { $sum: 1 }
        }
    },
    { $match: { total: { $gte: 5 } } },
    { $out: 'commonMFs' }
  ],
  {
    allowDiskUse: true
  }
  );
  await result.hasNext();

  const collectionCommonMFs = await pubChemConnection.getCollection('commonMFs');

  await collectionCommonMFs.createIndex({ em: 1 });

  return result;
}
