'use strict';

const pubChemConnection = new (require('../util/PubChemConnection'))();


aggregate()
  .catch((e) => console.log(e))
  .then(() => {
    console.log('Done');
    pubChemConnection.close();
  });

async function aggregate() {
  const dataCollection = (await pubChemConnection.getDatabase()).collection('data');
  console.log('Need to process', await dataCollection.count(), 'entries');
  return dataCollection.aggregate([{ $out: 'test' }]);
}
