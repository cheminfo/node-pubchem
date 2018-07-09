# node-pubchem

In this project we make a copy of pubchem and carefully alculate the monoisotopic mass of each of the molecule as well as the molecular formula taking into account charges, parts and isotopes.

We then provide an API that allows to quickly and efficiently search in the database.

## Setup

`npm run server8080`s

## Provided webservice

### /mfs/em

Search MF from monoisotopic mass

http://localhost:8080/mfs/em?em=300&precision=10

Parameters:

- em: the target monoisotopic mass, mandatory
- precision: mass precision in ppm (default: 100)
- limit: maximal number of results (default: 1000)

### /molecules/em

Search molecules from monoisotopic mass

If must be the exact value of the EM so that is can only be used from the previous query result

Parameters:

- em: the target monoisotopic mass, mandatory

http://localhost:8080/molecules/em?em=295.0000687128

### /molecules/mf

Search molecules from a molecular fomrula

If must be the exact value of the MF so that is can practically only be used from the previous query result

Parameters:

- mf: the target molecular formula, mandatory

http://localhost:8080/molecules/mf?mf=C10H20
