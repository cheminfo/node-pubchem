'use strict';

const pubChemConnection = new (require('../util/PubChemConnection'))();


aggregate()
  .catch((e) => console.log(e))
  .then(() => {
    console.log('Done');
    pubChemConnection.close();
  });

async function aggregate() {
  const dataCollection = (await pubChemConnection.getDatabase()).collection('data');
  console.log('Need to process', await dataCollection.count(), 'entries');
  return dataCollection.aggregate([
  //    { $limit: 1e4 },
    { $match: { nbFragments: 1, mf: { $not: /(\+|-)\d*$/ } } },
    { $project: { mf: 1, em: 1, unsat: 1, atom: 1 } },
    { $group:
      {
        _id: '$mf', count: { $sum: 1 },
        em: { $first: '$em' },
        unsaturation: { $first: '$unsat' },
        atom: { $first: '$atom' }
      }
    },
    { $out: 'aggregateMf' }
  ]);
}

