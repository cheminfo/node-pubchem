var connection = new Mongo('mongodb://de.cheminfo.org:27017,fr2.cheminfo.org:27017/pubchem-test?replicaSet=ci0');
var db = connection.getDB('pubchem-test');
var data = db.data;

data.aggregate([
//    { $limit: 1e4 },
    { $project: { mf: 1, em: 1, unsat: 1, atom: 1 } },
    { $group: { _id: '$mf', count: { $sum: 1 }, em: { $first: '$em' }, unsaturation: { $first: '$unsat'}, atom: { $first: '$atom' } } },
    { $out: 'aggregateMf' }
], {
    allowDiskUse: true
});

