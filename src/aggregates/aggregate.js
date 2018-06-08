'use strict';

aggregate();

async function aggregate() {
  await require('./MFs')();
  await require('./commonMFs')();
  await require('./CHNOSClF')();
}

