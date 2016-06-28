'use strict';

const mongo = require('mongo');
const co = require('co');
const dataCollection = mongo.connect().then(db => db.collection('data'));

const defaultSearchEmOptions = {
    limit: 1e3,
    resolution: 1e6
};
const searchEm = co.wrap(function* em(value, options) {
    if (typeof value !== 'number') {
        throw new Error('value must be a number');
    }
    options = Object.assign({}, defaultSearchEmOptions, options);

    if (options.limit > 1e4) options.limit = 1e4;
    if (options.limit < 1) options.limit = 1;

    let error;
    if (options.accuracy) { // accuracy is in ppm
        error = value / 1e6 * options.accuracy;
    } else {
        error = value / options.resolution;
    }

    const data = yield dataCollection;
    const searchBottom = data.find({em: {$lte: value, $gte: value - error}}).sort({em: -1}).limit(options.limit).project({'ocl.id': 1, mf: 1, em: 1}).toArray();
    const searchTop = data.find({em: {$gt: value, $lte: value + error}}).sort({em: 1}).limit(options.limit).project({'ocl.id': 1, mf: 1, em: 1}).toArray();
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
                    molecules: []
                }
            }
            element.molecules.push({
                id: resultValue._id,
                oclID: resultValue.ocl.id,
            });
        }
    });

    return results;
});

exports.search = {
    em: searchEm
};
