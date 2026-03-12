const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Fehler beim Lesen von ${filePath}:`, error);
    return [];
  }
}

function writeJson(filePath, data) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Fehler beim Schreiben von ${filePath}:`, error);
  }
}

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

module.exports = {
  readJson,
  writeJson,
  generateId
};