'use strict';

const config = require('./config');

const MongoClient = require('mongodb').MongoClient;

function PubChemConnection() {}

PubChemConnection.prototype.close = function close() {
  if (this.connection) return this.connection.close();
};

PubChemConnection.prototype.getMoleculesCollection = async function getDatabase() {
  return (await this.getDatabase()).collection('molecules');
};

PubChemConnection.prototype.getAdminCollection = async function getDatabase() {
  return (await this.getDatabase()).collection('admin');
};

PubChemConnection.prototype.getMfsCollection = async function getDatabase() {
  return (await this.getDatabase()).collection('mfs');
};

PubChemConnection.prototype.getMfStatsCollection = async function getDatabase() {
  return (await this.getDatabase()).collection('mfstats');
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
