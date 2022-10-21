"use strict";

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getState = getState;
exports.setState = setState;

var fs = _interopRequireWildcard(require("fs"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Private helper function used to get the state from file
 * @param {String} id - Id of blind
 * @returns {Object} structured objected containing blind data
 */
function readStateFromFile(id) {
  var filename = "./".concat(id, ".json");
  var state;

  if (!fs.existsSync(filename)) {
    // Return initial state
    state = {
      currentValue: 0,
      positionState: "stopped"
    };
  } else {
    state = JSON.parse(fs.readFileSync(filename));

    if (isNaN(parseInt(state.currentValue))) {
      throw "No valid currentValue code in file ./".concat(id, ".txt");
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
  var filename = "./".concat(id, ".json");
  var toWrite = JSON.stringify(state, null, 4);
  fs.writeFileSync(filename, toWrite, function (err) {
    if (err) throw err;
  });
}
/**
 * Handle requests to get the current value of the "On" characteristic
 * @method getOn
 * @param {String} id - Id of blind
 * @returns {Boolean} - true = blind closed; false = blind open
 */


function getState(id, key) {
  if (!id) throw "No id passed to function";
  if (!key) throw "No key passed to function";
  var state = readStateFromFile(id);
  return state[key];
}
/**
 * Set the current value of the "On" characteristic
 * @method setOn
 * @param {String} id - Id of blind
 * @param {String} value - Value to set
 * @returns {Boolean} - true = blind closed; false = blind open
 */


function setState(id, key, value) {
  if (!id) throw "No id passed to function";
  if (!key) throw "No key passed to function";
  var state = readStateFromFile(id); // Update value

  state[key] = value;
  writeStateToFile(id, state);
}