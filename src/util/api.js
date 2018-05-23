'use strict';

const mongo = require('mongo');
const co = require('co');

const dataCollection = mongo.connect().then((db) => db.collection('data'));
const mfStatsCollection = mongo.connect().then((db) => db.collection('mfStats'));

const defaultSearchEmOptions = {
  limit: 1e3,
  precision: 100
};
const searchEm = co.wrap(function* searchEm(value, options) {
  if (typeof value !== 'number') {
    throw new TypeError('value must be a number');
  }
  options = Object.assign({}, defaultSearchEmOptions, options);

  if (options.limit > 1e4) options.limit = 1e4;
  if (options.limit < 1) options.limit = 1;

  let error = value / 1e6 * options.precision;

  const data = yield dataCollection;
  const searchBottom = data.find({ em: { $lte: value, $gte: value - error } }).sort({ em: -1 }).limit(options.limit).project({ _id: -1, em: 1, mf: 1 }).toArray();
  const searchTop = data.find({ em: { $gt: value, $lte: value + error } }).sort({ em: 1 }).limit(options.limit).project({ _id: -1, em: 1, mf: 1 }).toArray();
  const results = yield Promise.all([searchBottom, searchTop]);

  const uniqueMFs = new Map();
  results.forEach(function treatResult(result) {
    for (const resultValue of result) {
      let element = uniqueMFs.get(resultValue.mf);
      if (!element) {
        element = {
          mf: resultValue.mf,
          em: resultValue.em,
          ppm: Math.abs(resultValue.em - value) / value * 1e6,
          total: 0
        };
        uniqueMFs.set(resultValue.mf, element);
      }
      element.total++;
    }
  });

  const finalResult = Array.from(uniqueMFs.values());
  finalResult.sort((a, b) => a.ppm - b.ppm);
  return finalResult;
});

exports.search = {
  em: searchEm
};

const moleculesEm = co.wrap(function* moleculesEm(query) {
  if (!query.em) {
    throw new Error('em parameters must be specified, mf is optional');
  }
  const em = +query.em;
  const mf = query.mf;

  const mongoQuery = { em };
  if (mf) mongoQuery.mf = mf;

  const data = yield dataCollection;
  const result = yield data.find(mongoQuery).project({ _id: 1, iupac: 1, ocl: 1, mf: 1, em: 1, nbFragments: 1, charge: 1 }).limit(10000).toArray();
  return result.map((el) => {
    return {
      id: el._id,
      iupac: el.iupac,
      ocl: el.ocl,
      mf: el.mf,
      em: el.em,
      nbFragments: el.nbFragments,
      charge: el.charge
    };
  });
});

const moleculesMf = co.wrap(function* moleculesMf(query = {}) {
  if (typeof query.mf !== 'string') {
    throw new TypeError('value must be a string');
  }

  let sort = null;
  if (query.sort && (query.sort.endsWith('em') || query.sort.endsWith('mf'))) {
    const field = /(-?)(\w+)/.exec(query.sort);
    var value = 1;
    if (field) {
      if (field[1] === '-') value = -1;
      sort = { [field[2]]: value };
    }
  }
  const limit = Math.max(0, Math.min(query.limit|0, 10000));
  const skip = Math.max(0, query.skip|0);

  const data = yield dataCollection;
  let result = data
    .find({ mf: query.mf })
    .project({ _id: 1, iupac: 1, ocl: 1, mf: 1, em: 1, nbFragments: 1, charge: 1 })
    .limit(limit)
    .skip(skip);

  if (sort) result = result.sort(sort);

  result = yield result.toArray();
  return result.map((el) => {
    return {
      id: el._id,
      iupac: el.iupac,
      ocl: el.ocl,
      mf: el.mf,
      em: el.em,
      nbFragments: el.nbFragments,
      charge: el.charge
    };
  });
});

/*
Search statistics about a kind of molecular formula
You may specify the stepMass and elementRatios
 */
const mfStatsSearch = co.wrap(function* mfStatsSearch(query = {}) {
  var {
    stepMass = 25,
    elementRatios = 'C-H.C-N.C-O.C-S.C-P.C-FClBr.O-P.O-S.CCNP-HFClBr',
    id
  } = query;

  if (!id) id = `${stepMass}_${elementRatios}`;

  const stats = yield mfStatsCollection;
  return yield stats.findOne({ _id: id });
});


const mfStatsToc = co.wrap(function* mfStatsSearch(query = {}) {
  const stats = yield mfStatsCollection;
  return yield stats.find().project({ _id: 1, options: 1, info: 1 }).limit(10000).toArray();
});

exports.molecules = {
  em: moleculesEm,
  mf: moleculesMf
};

exports.mfStats = {
  search: mfStatsSearch,
  toc: mfStatsToc
};
