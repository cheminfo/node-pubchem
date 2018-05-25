'use strict';

// query for molecules from molecular formula
const pubChemConnection = new (require('../util/PubChemConnection'))();

module.exports = async function moleculesFromMf(mf, options = {}) {
  const collection = await pubChemConnection.getMoleculesCollection();
  if (!mf) {
    throw new Error('mf parameter must be specified');
  }

  const mongoQuery = { mf };
  return collection.aggregate(
    [
      { $match: mongoQuery },
      { $limit: 1 },
      { $project: {
        id: '$_id', iupac: 1, ocl: 1, mf: 1, em: 1, nbFragments: 1, charge: 1
      } }
    ]).toArray();
};

