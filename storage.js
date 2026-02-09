const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "data.json");

// Loads all
function loadData() {
    try {
        const raw = fs.readFileSync(dataPath, "utf-8");
        return JSON.parse(raw);
    } catch {
        return { boards: [], columns: [], cards: [], labels: [] };
    }
}

// Saves all locally
function saveData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

module.exports = { loadData, saveData };