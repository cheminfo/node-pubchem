'use strict';

process.on('unhandledRejection', function (e) {
    throw e;
});

const bluebird = require('bluebird');
const co = require('co');
const fs = bluebird.promisifyAll(require('fs'));
const mlStat = require('ml-stat/array');

const mongo = require('mongo');

const rules = require('./rules.json');
const allowedElements = rules.allowedElements;
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
        if (isFormulaAllowed(nextValue)) {
            formulas.push(nextValue);
        }
    }
    formulas.sort((a, b) => a.em - b.em);
    addRatios(formulas);

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

function isFormulaAllowed(formula) {
    if (formula.em > maxMass || formula.em < minMass) {
        return false;
    }
    if (!('C' in formula.atom)) {
        return false;
    }
    for (var key in formula.atom) {
        if (!allowedElements.includes(key)) {
            return false;
        }
    }
    return true;
}

function addRatios(formulas) {
    for (var j = 0; j < elementRatios.length; j++) {
        var topAtoms = elementRatios[j].split('/')[0];
        var bottomAtoms = elementRatios[j].split('/')[1];
        var topAtomsArray = topAtoms.split(/(?=[A-Z])/);
        var bottomAtomsArray = bottomAtoms.split(/(?=[A-Z])/);
        for (var i = 0; i < formulas.length; i++) {
            var mf = formulas[i];
            if (j === 0) mf.ratios = {};
            var top = getSumAtoms(topAtomsArray, mf);
            var bottom = getSumAtoms(bottomAtomsArray, mf);
            mf.ratios[elementRatios[j]] = top / bottom;
        }
    }
}

function getSumAtoms(atoms, mf) {
    var sum = 0;
    for (var k = 0; k < atoms.length; k++) {
        if (mf.atom[atoms[k]]) sum += mf.atom[atoms[k]];
    }
    return sum;
}

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
            if (ratio === 0) {
                stat.zeros++;
            } else if (Number.isNaN(ratio) || ratio === Infinity) {
                stat.infinities++;
            } else {
                stat.valids++;
                var ratioLN = Math.log2(ratio);
                log2array.push(ratioLN);
                if (ratioLN < rules.ratioMinValue) {
                    stat.distribution[0] += rules.weighted ? mfs[i].count : 1;
                    // the first slot
                }
                if (ratioLN > rules.ratioMaxValue) {
                    stat.distribution[distributionLength - 1] += rules.weighted ? mfs[i].count : 1;
                    // the last slot
                } else {
                    var slot = Math.floor(((ratioLN - rules.ratioMinValue) / rules.ratioSlotWidth - 1));
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
