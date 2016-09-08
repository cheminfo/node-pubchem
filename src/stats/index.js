'use strict';

process.on('unhandledRejection', function (e) {
    throw e;
});

const bluebird = require('bluebird');
const co = require('co');
const fs = bluebird.promisifyAll(require('fs'));
const mlStat = require('ml-stat/array');

const mongo = require('mongo');
const functions = require('mf');
const rules = require('rules');

const minMass = rules.minMass;
const maxMass = rules.maxMass;
const stepMass = rules.stepMass;
const elementRatios = rules.elementRatios;
const distributionLength = (rules.ratioMaxValue - rules.ratioMinValue) / rules.ratioSlotWidth;

let db;
co(function*() {
    db = yield mongo.connect();
    console.error('connected to MongoDB');

    const aggregateMf = db.collection('aggregateMf');
    const cursor = aggregateMf.find();

    const formulas = [];
    while (yield cursor.hasNext()) {
        const nextValue = yield cursor.next();
        if (functions.isFormulaAllowed(nextValue, minMass, maxMass)) {
            formulas.push(nextValue);
        }
    }
    formulas.sort((a, b) => a.em - b.em);
    functions.addRatios(formulas);

    var bins = [];
    var start = 0;
    var end = 0;
    var maxIndex = formulas.length - 1;
    for (var mass = minMass + stepMass; mass <= maxMass; mass += stepMass) {
        while (end <= maxIndex && formulas[end].em < mass) {
            end++;
        }
        var sliced = formulas.slice(start, end);
        var stats = getStats(sliced);
        bins.push({
            minMass: mass - stepMass,
            maxMass: mass,
            nFormulas: sliced.length,
            stats: stats
        });
        start = end;
    }

    var result = {
        options: rules,
        results: bins
    };

    console.log(JSON.stringify(result, null, 2));
}).catch(function (e) {
    console.error('error');
    console.error(e);
}).then(function () {
    console.error('closing DB');
    if (db) db.close();
});

function getStats(mfs) {
    var stats = [];
    for (var key of elementRatios) {
        var stat = {
            kind: key,
            zeros: 0,
            infinities: 0,
            valids: 0,
            distribution: new Array(distributionLength).fill(0)
        };
        stats.push(stat);

        var log2array = [];

        for (var i = 0; i < mfs.length; i++) {
            var ratio = mfs[i].ratios[key];
            if (ratio === -Infinity) { // Math.log2(0)
                stat.zeros++;
            } else if (Number.isNaN(ratio) || ratio === Infinity) { // Math.log2(NaN) || Math.log2(Infinity)
                stat.infinities++;
            } else {
                stat.valids++;
                log2array.push(ratio);
                if (ratio < rules.ratioMinValue) {
                    stat.distribution[0] += rules.weighted ? mfs[i].count : 1;
                    // the first slot
                }
                if (ratio > rules.ratioMaxValue) {
                    stat.distribution[distributionLength - 1] += rules.weighted ? mfs[i].count : 1;
                    // the last slot
                } else {
                    var slot = Math.floor(((ratio - rules.ratioMinValue) / rules.ratioSlotWidth - 1));
                    // eg. min = -10, max = 10, width = 0.5. For ratioLN = -8, slot is 3.

                    /* var slot = Math.floor((ratioLN+7)*5); */
                    stat.distribution[slot] += rules.weighted ? mfs[i].count : 1;
                }
            }
        }

        stat.mean = mlStat.mean(log2array);
        stat.standardDeviation = mlStat.standardDeviation(log2array);
    }
    return stats;
}
