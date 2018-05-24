'use strict';

const config = require('./config');

const MongoClient = require('mongodb').MongoClient;

function PubChemConnection() {}

PubChemConnection.prototype.close = function close() {
  if (this.connection) return this.connection.close();
};

PubChemConnection.prototype.getDataCollection = async function getDatabase() {
  return (await this.getDatabase()).collection('data');
};

PubChemConnection.prototype.getStatsCollection = async function getDatabase() {
  return (await this.getDatabase()).collection('data');
};

PubChemConnection.prototype.getDatabase = async function getDatabase() {
  await this.init();
  return this.connection.db(config.databaseName);
};

PubChemConnection.prototype.init = async function init() {
  if (this.connection) return;
  this.connection = await MongoClient.connect(config.mongodbUrl, { autoReconnect: true });
};

module.exports = PubChemConnection;
