const fs = require('fs');

/**
 * Saves data to a JSON file
 * @param {any} data - Data to save (will be stringified)
 * @param {string} filePath - Path to the JSON file
 */
function saveToJSON(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Loads data from a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {any} Parsed JSON data
 */
function loadJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

module.exports = { saveToJSON, loadJSON };
