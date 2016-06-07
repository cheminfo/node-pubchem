'use strict';

const OCL = require('openchemlib');

exports.getMolecule = function (molecule) {
    const oclMol = OCL.Molecule.fromMolfile(molecule.molfile);
    const oclID = oclMol.getIDCodeAndCoordinates();
    const result = {
        _id: +molecule.PUBCHEM_COMPOUND_CID,
        ocl: {
            id: oclID.idCode,
            coord: oclID.coordinates
        },
        inchi: molecule.PUBCHEM_IUPAC_INCHI,
        inchiKey: molecule.PUBCHEM_IUPAC_INCHIKEY,
        iupac: molecule.PUBCHEM_IUPAC_NAME,
        mf: molecule.PUBCHEM_MOLECULAR_FORMULA,
        em: molecule.PUBCHEM_EXACT_MASS,
        mw: molecule.PUBCHEM_MOLECULAR_WEIGHT
    };
    return result;
};
