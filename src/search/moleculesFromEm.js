'use strict';

// query for molecules from monoisotopic mass
const pubChemConnection = new (require('../util/PubChemConnection'))();

module.exports = async function moleculesFromEm(em, options = {}) {
  const collection = await pubChemConnection.getMoleculesCollection();
  if (!em) {
    throw new Error('em parameter must be specified');
  }
  const epsilon = 0.000001;
  const mongoQuery = { em: { $lt: Number(em) + epsilon, $gt: Number(em) - epsilon } };
  return collection.aggregate(
    [
      { $match: mongoQuery },
      { $limit: 1 },
      { $project: {
        id: '$_id', iupac: 1, ocl: 1, mf: 1, em: 1, nbFragments: 1, charge: 1
      } }
    ]).toArray();
};

