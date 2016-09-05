'use strict';

const OCL = require('openchemlib');
const chemcalc = require('chemcalc');

const fragmentContainer = new Array(1024);

exports.getMolecule = function (molecule) {
    const oclMol = OCL.Molecule.fromMolfile(molecule.molfile);
    const oclID = oclMol.getIDCodeAndCoordinates();
    const fragments = oclMol.getFragmentNumbers(fragmentContainer);
    const chemcalcMF = chemcalc.analyseMF(molecule.PUBCHEM_MOLECULAR_FORMULA.replace(/([+-].*)/, '($1)'));
    const atom = {};
    var atoms = chemcalcMF.parts[0].ea;
    atoms.forEach(a => atom[a.element] = a.number);
    const result = {
        _id: +molecule.PUBCHEM_COMPOUND_CID,
        seq: 0,
        ocl: {
            id: oclID.idCode,
            coord: oclID.coordinates
        },
        nbFragments: fragments,
        // inchi: molecule.PUBCHEM_IUPAC_INCHI,
        // inchiKey: molecule.PUBCHEM_IUPAC_INCHIKEY,
        iupac: molecule.PUBCHEM_IUPAC_NAME,
        mf: molecule.PUBCHEM_MOLECULAR_FORMULA,
        em: molecule.PUBCHEM_EXACT_MASS,
        mw: molecule.PUBCHEM_MOLECULAR_WEIGHT,
        unsat: chemcalcMF.parts[0].unsaturation,
        atom
    };
    return result;
};
