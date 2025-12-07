const fs = require('fs/promises');

/**
 * Saves data to a JSON file
 * @param {any} data - Data to save (will be stringified)
 * @param {string} filePath - Path to the JSON file
 */
async function saveStudents(data, filePath) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    throw new Error(`Failed to save students: ${error.message}`);
  }
}

/**
 * Loads data from a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {any} Parsed JSON data
 */
async function loadStudents(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to load students: ${error.message}`);
  }
}

module.exports = { saveStudents, loadStudents };
