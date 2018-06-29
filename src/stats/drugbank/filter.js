'use strict';

const path = require('path');

const fs = require('fs-extra');
const CC = require('chemcalc');
const OCL = require('openchemlib-extended');
const parse = require('sdf-parser');
const mfUtil = require('mf');

const fragmentContainer = new Array(1024);
const theSet = new Set();

var sdf = fs.readFileSync(path.join(__dirname, 'data/structures.sdf'), 'utf8');
var result = parse(sdf, {
  include: ['FORMULA'],
  filter(entry) {
    const mf = entry.FORMULA;
    if (theSet.has(mf)) return false;
    theSet.add(mf);
    let ccMf;
    try {
      ccMf = CC.analyseMF(mf);
    } catch (e) {
      // ignore polymers (only 2 entries)
      return false;
    }
    const unsaturation = ccMf.parts[0].unsaturation;
    if (unsaturation < 0 || (unsaturation >> 0 !== unsaturation)) {
      return false;
    }
    entry.EM = ccMf.em;
    ccMf.atom = mfUtil.getAtoms(ccMf);
    if (!mfUtil.isFormulaAllowed(ccMf, 0, 1000.5)) return false;
    const mol = OCL.Molecule.fromMolfile(entry.molfile);
    return mol.getFragmentNumbers(fragmentContainer) === 1;
  }
});

const map = result.molecules.map((mol) => {
  return {
    mf: mol.FORMULA,
    em: mol.EM
  };
});

map.sort((a, b) => a.em - b.em);

var list = [
  {
    minMass: 0.5,
    maxMass: 250.5
  },
  {
    minMass: 250.5,
    maxMass: 500.5
  },
  {
    minMass: 500.5,
    maxMass: 750.5
  },
  {
    minMass: 750.5,
    maxMass: 1000.5
  }
];

list.forEach((el) => {
  el.formulas = map.filter((mf) => mf.em >= el.minMass && mf.em < el.maxMass);
});

fs.writeFileSync(path.join(__dirname, 'data/mfs.json'), JSON.stringify(list));
