const { readJson, writeJson } = require('./helpers');

function getSystemYear() {
  return new Date().getFullYear();
}

function getCurrentYear() {
  const config = readJson('data/config.json', {});
  const systemYear = getSystemYear();

  if (!config.currentYear || config.currentYear !== systemYear) {
    config.currentYear = systemYear;

    if (!config.overviewMessages) config.overviewMessages = {};
    if (!config.supporterMessages) config.supporterMessages = {};

    writeJson('data/config.json', config);
  }

  return config.currentYear;
}

function getTransactionYear(tx, fallbackYear = null) {
  return tx.year ?? fallbackYear ?? getCurrentYear();
}

module.exports = {
  getSystemYear,
  getCurrentYear,
  getTransactionYear
};