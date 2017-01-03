'use strict';

const OCLE = require('openchemlib-extended');
const chemcalc = require('chemcalc');
const mfUtil = require('mf');

const fragmentContainer = new Array(1024);

exports.getMolecule = function (molecule) {
    const oclMol = OCLE.Molecule.fromMolfile(molecule.molfile);
    const oclID = oclMol.getIDCodeAndCoordinates();
    const fragments = oclMol.getFragmentNumbers(fragmentContainer);
    
    const mf=oclMol.getMF().parts.join('.');
    const chemcalcMF = chemcalc.analyseMF(mf);
    const result = {
        _id: +molecule.PUBCHEM_COMPOUND_CID,
        seq: 0,
        ocl: {
            id: oclID.idCode,
            coord: oclID.coordinates
        },
        iupac: molecule.PUBCHEM_IUPAC_NAME,
        mf: mf,
        em: chemcalcMF.em,
        mw: chemcalcMF.mw,
        unsat: chemcalcMF.unsaturation,
        charge: chemcalcMF.charge,
        atom: mfUtil.getAtoms(chemcalcMF),
        nbFragments: fragments
    };
    return result;
};
