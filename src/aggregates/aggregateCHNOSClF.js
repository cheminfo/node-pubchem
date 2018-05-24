'use strict';

const pubChemConnection = new (require('../util/PubChemConnection'))();


aggregate()
  .catch((e) => console.log(e))
  .then(() => {
    console.log('Done');
    pubChemConnection.close();
  });

async function aggregate() {
  const collection = await pubChemConnection.getDataCollection();
  console.log('Need to process', await collection.count(), 'entries');
  let result = collection.aggregate([
    { $limit: 1e10 },
    { $match: { nbFragments: 1, mf: { $regex: /^C[0-9]*H[0-9]*Cl?[0-9]*F?[0-9]*N?[0-9]*O?[0-9]*S?[0-9]*$/ }, charge: { $lte: 1, $gte: -1 } } },
    { $project: { mf: 1, em: 1, unsat: 1, atom: 1 } },
    { $group: { _id: '$mf', count: { $sum: 1 }, em: { $first: '$em' }, unsaturation: { $first: '$unsat' } } },
    { $out: 'aggregateCHNOSClF' }
  ], {
    allowDiskUse: true
  });
  await result.hasNext(); // trigger the creation of the output collection
  return result;
}
