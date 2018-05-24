'use strict';

const pubChemConnection = new (require('../util/PubChemConnection'))();

aggregate()
  .catch((e) => console.log(e))
  .then((result) => {
    console.log('Done');
    pubChemConnection.close();
  });

async function aggregate() {
  const collection = await pubChemConnection.getDataCollection();
  console.log('Need to process', await dataCollection.count(), 'entries');
  let result = await dataCollection.aggregate([
  //    { $limit: 1e4 },
    { $match: { nbFragments: 1, mf: { $not: /(\+|-)\d*$/ } } }, // we don't want charges in MF
    { $project: { mf: 1, em: 1, unsat: 1, atom: 1 } },
    { $group:
        {
          _id: '$mf', count: { $sum: 1 },
          em: { $first: '$em' },
          unsaturation: { $first: '$unsat' },
          atom: { $first: '$atom' }
        }
    },
    { $out: 'aggregateMF' }
  ],
  {
    allowDiskUse: true
  }
  );
  await result.hasNext();
  return result;
}

