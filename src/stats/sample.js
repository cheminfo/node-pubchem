'use strict';

process.on('unhandledRejection', function (e) {
    throw e;
});

const bluebird = require('bluebird');
const co = require('co');
const CC = require('chemcalc');
const fs = bluebird.promisifyAll(require('fs'));

const mongo = require('mongo');
const functions = require('mf');
const rules = require('rules');
const ppm = rules.samplePpm;
const penality = rules.ratioPenality;
const stats = require('../../stats.json');
const ratioStats = stats.results.filter((stat) => {
    return stat.minMass >= rules.sampleMin && stat.maxMass <= rules.sampleMax;
});

let db;
co(function*() {
    db = yield mongo.connect();
    console.error('connected to MongoDB');

    const aggregateMf = db.collection('aggregateMf');
    const formulaSet = new Set();
    while (formulaSet.size < rules.randomSamples) {
        const sampling = yield aggregateMf.aggregate([
            {$sample: {size: 1000}}
        ]).toArray();
        for (var i = 0; i < sampling.length && formulaSet.size < rules.randomSamples; i++) {
            var sample = sampling[i];
            if (functions.isFormulaAllowed(sample, rules.sampleMin, rules.sampleMax) && !formulaSet.has(sample._id)) {
                formulaSet.add(sample._id);
            }
        }
    }
    const formulas = Array.from(formulaSet);
    const result = formulas.map(analyseFormula);
    console.log(JSON.stringify(result, null, 2));
}).catch(function (e) {
    console.error('error');
    console.error(e);
}).then(function () {
    console.error('closing DB');
    if (db) db.close();
});

function analyseFormula(mf, index) {
    console.error(`${mf} (${index})`);
    const result = {
        mf: mf,
        em: 0,
        ppm: new Array(ppm.length)
    };
    const info = CC.analyseMF(mf, {
        isotopomers: 'arrayXXYY',
        fwhm: 0.3
    });
    info.arrayXXYY[0] = info.arrayXXYY[0].map(value => Math.round(value));
    const em = result.em = info.em;

    var allCandidates = CC.mfFromMonoisotopicMass(em, {
        mfRange: rules.sampleMfRange,
        massRange: em * ppm[ppm.length - 1] / 1e6,
        useUnsaturation: true,
        maxNumberRows: 1e6
    });
    var candidatesList = allCandidates.results;
    candidatesList.forEach((candidate) => {
        var mf = CC.analyseMF(candidate.mf);
        candidate.atom = functions.getAtoms(mf);
    });
    functions.addRatios(candidatesList);
    calculateScores(candidatesList);

    var end = candidatesList.length - 1;
    for (var i = ppm.length - 1; i >= 0; i--) {
        var ppmValue = ppm[i];
        while (Math.abs(candidatesList[end].ppm) >= ppmValue && end >= 0) {
            end--;
        }
        var candidates = candidatesList.slice(0, end + 1);
        candidates.sort((candA, candB) => candB.ratioScore - candA.ratioScore);
        var sortedIndex = candidates.findIndex((cand) => cand.em === em);

        result.ppm[i] = {
            numberResults: candidates.length,
            ratioIndex: sortedIndex,
            ratioScore: candidates[sortedIndex].ratioScore,
            thisRatio: candidates[sortedIndex],
            bestRatio: candidates[0]
        };
    }

    return result;
}

function calculateScores(candidates) {
    for (var i = 0; i < candidates.length; i++) {
        var candidate = candidates[i];
        var em = candidate.em;
        var ratioStat = ratioStats.find((stat) => {
            return em >= stat.minMass && em < stat.maxMass;
        }).stats;
        var score = 1;
        for (var j = 0; j < ratioStat.length; j++) {
            var stat = ratioStat[j];
            var kind = stat.kind;
            var ratio = candidate.ratios[kind];
            var mean = stat.mean;
            var sd = stat.standardDeviation;
            if (ratio && ratio !== 0 && ratio !== Infinity) {
                var distance = Math.abs(ratio - mean) / sd;
                if (distance > 2) {
                    score *= Math.pow(penality, distance - 2);
                }
            }
        }
        candidate.ratioScore = score;
    }
}
