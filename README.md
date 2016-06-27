# node-pubchem

## Setup

### Create a mounted directory to access PubChem data

```bash
yum install curlftpfs
mkdir /mnt/ftp.ncbi.nlm.nih.gov
curlftpfs ftp.ncbi.nlm.nih.gov /mnt/ftp.ncbi.nlm.nih.gov
```
