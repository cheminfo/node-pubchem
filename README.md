# node-pubchem

## Setup

### Create a mounted directory to access PubChem data

```bash
yum install curlftpfs
mkdir /mnt/ftp.ncbi.nlm.nih.gov
curlftpfs ftp.ncbi.nlm.nih.gov /mnt/ftp.ncbi.nlm.nih.gov
```

## Provided webservice

### Search MF from monoisotopic mass

http://pubchem.cheminfo.org/search/em?value=300&precision=10


### Search molecule from monoisotopic mass

If must be the exact value of the EM so that is can only be used from the previous query result

http://pubchem.cheminfo.org/molecules/em?value=XXX
