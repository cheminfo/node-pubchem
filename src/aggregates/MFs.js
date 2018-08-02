'use strict';

const pubChemConnection = new (require('../util/PubChemConnection'))();

module.exports = async function () {
  return MFs(pubChemConnection)
    .catch((e) => console.log(e))
    .then((result) => {
      console.log('Done');
      pubChemConnection.close();
    });
};

async function MFs(pubChemConnection) {
  const collection = await pubChemConnection.getMoleculesCollection();
  console.log('MFs: Need to aggregate', await collection.count(), 'entries');
  let result = await collection.aggregate(
    [
      //    { $limit: 1e4 },
      { $match: { nbFragments: 1, charge: 0 } }, // we don't want charges in MF
      { $project: { _id: 0, mf: 1, em: 1, unsaturation: 1, atom: 1 } },
      {
        $group: {
          _id: '$mf',
          em: { $first: '$em' },
          unsaturation: { $first: '$unsaturation' },
          atom: { $first: '$atom' },
          total: { $sum: 1 }
        }
      },
      { $out: 'mfs' }
    ],
    {
      allowDiskUse: true,
      maxTimeMS: 60 * 60 * 1000 // 1h
    }
  );
  await result.hasNext();
  return result;
}
