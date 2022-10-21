"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _DeltaBlindAccessory = _interopRequireDefault(require("./DeltaBlindAccessory.js"));

module.exports = function (api) {
  api.registerAccessory("Delta Blinds", _DeltaBlindAccessory["default"]);
};