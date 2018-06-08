'use strict';

const delay = require('delay');


const aggregate = require('../aggregates/aggregate');

const firstImport = require('./firstImport');
const update = require('./update');

let sleepTime = 1000 * 24 * 3600;

cron();

async function cron() {
  await firstImport();
  while (true) {
    await update();
    await aggregate();
    await delay(sleepTime);
  }
}

