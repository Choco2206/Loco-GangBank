const fs = require('fs');
const path = require('path');

function ensureFileExists(filePath, fallback) {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function readJson(file, fallback = []) {
  const fullPath = path.join(__dirname, '..', file);

  try {
    ensureFileExists(fullPath, fallback);
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Fehler beim Lesen von ${file}:`, err);
    return fallback;
  }
}

function writeJson(file, data) {
  const fullPath = path.join(__dirname, '..', file);

  try {
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Fehler beim Schreiben von ${file}:`, err);
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