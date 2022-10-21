import * as fs from "fs";

/**
 * Private helper function used to get the state from file
 * @param {String} id - Id of blind
 * @returns {Object} structured objected containing blind data
 */
function readStateFromFile(id) {
  const filename = `./${id}.json`;
  let state;

  if (!fs.existsSync(filename)) {
    // Return initial state
    state = {
      currentValue: 0,
      positionState: "stopped"
    };
  } else {
    state = JSON.parse(fs.readFileSync(filename));

    if (isNaN(parseInt(state.currentValue))) {
      throw `No valid currentValue code in file ./${id}.txt`;
    }
  }

  return state;
}

/**
 * Private helper function used to set the state in file
 * @param {String} id - Id of blind
 * @returns {Object} structured objected containing blind data
 */
function writeStateToFile(id, state) {
  const filename = `./${id}.json`;
  const toWrite = JSON.stringify(state, null, 4);

  fs.writeFileSync(filename, toWrite, err => {
    if (err) throw err;
  });
}

/**
 * Handle requests to get the current value of the "On" characteristic
 * @method getOn
 * @param {String} id - Id of blind
 * @returns {Boolean} - true = blind closed; false = blind open
 */
export function getState(id, key) {
  if (!id) throw "No id passed to function";
  if (!key) throw "No key passed to function";

  let state = readStateFromFile(id);

  return state[key];
}

/**
 * Set the current value of the "On" characteristic
 * @method setOn
 * @param {String} id - Id of blind
 * @param {String} value - Value to set
 * @returns {Boolean} - true = blind closed; false = blind open
 */
export function setState(id, key, value) {
  if (!id) throw "No id passed to function";
  if (!key) throw "No key passed to function";

  let state = readStateFromFile(id);

  // Update value
  state[key] = value;

  writeStateToFile(id, state);
}
