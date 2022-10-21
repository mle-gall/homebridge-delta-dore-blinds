"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var BlindState = _interopRequireWildcard(require("./BlindState.js"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var rpio = require("rpio");

var debounce = require("debounce-promise");

var DeltaBlindAccessory = /*#__PURE__*/function () {
  function DeltaBlindAccessory(log, config, api) {
    (0, _classCallCheck2["default"])(this, DeltaBlindAccessory);
    this.log = log;
    this.config = config;
    this.api = api;
    this.id = config.id;
    this.log.debug("DeltaBlinds Accessory Plugin Loaded");
    this.Characteristic = this.api.hap.Characteristic; // extract name from config

    this.name = config.name;
    this.pinOpen = config.pinOpen;
    this.pinClose = config.pinClose;
    this.maneuverLength = config.maneuverLength * 1000; //RPIO initiallisation

    rpio.open(this.pinOpen, rpio.OUTPUT, rpio.LOW);
    rpio.open(this.pinClose, rpio.OUTPUT, rpio.LOW); // create a new Window Covering service

    this.service = new this.api.hap.Service.WindowCovering(this.name);
    var self = this;

    var promiseSetter = function promiseSetter(fn) {
      var boundDebounced = debounce(fn.bind(self), 1000, {
        leading: false
      });
      return function (value, next) {
        boundDebounced(value, next);
      };
    }; // create handlers for required characteristics


    this.service.getCharacteristic(this.Characteristic.CurrentPosition).onGet(this.handleCurrentPositionGet.bind(this));
    this.service.getCharacteristic(this.Characteristic.PositionState).onGet(this.handlePositionStateGet.bind(this));
    this.service.getCharacteristic(this.Characteristic.TargetPosition).onGet(this.handleTargetPositionGet.bind(this)).onSet(promiseSetter(this.handleTargetPositionSet.bind(this)));
    BlindState.setState(this.id, "targetValue", 0);
    BlindState.setState(this.id, "positionState", "stopped");
    this.maneuver = this.maneuver.bind(this);
    this.handleManeuverSelection = this.handleManeuverSelection.bind(this);
    this.pressClose = this.pressClose.bind(this);
    this.pressOpen = this.pressOpen.bind(this);
  }
  /**
   * Handle requests to get the current value of the "Current Position" characteristic
   */


  (0, _createClass2["default"])(DeltaBlindAccessory, [{
    key: "handleCurrentPositionGet",
    value: function handleCurrentPositionGet() {
      // set this to a valid value for CurrentPosition
      return parseInt(BlindState.getState(this.id, "currentValue"), 10);
    }
    /**
     * Handle requests to get the current value of the "Position State" characteristic
     */

  }, {
    key: "handlePositionStateGet",
    value: function handlePositionStateGet() {
      var positionStateByValue = {
        increasing: this.Characteristic.PositionState.INCREASING,
        decreasing: this.Characteristic.PositionState.DECREASING,
        stopped: this.Characteristic.PositionState.STOPPED
      };
      var state = BlindState.getState(this.id, "positionState"); // set this to a valid value for PositionState

      return positionStateByValue[state];
    }
    /**
     * Handle requests to get the current value of the "Target Position" characteristic
     */

  }, {
    key: "handleTargetPositionGet",
    value: function handleTargetPositionGet() {
      return BlindState.getState(this.id, "targetValue");
    }
  }, {
    key: "pressOpen",
    value: function pressOpen() {
      var _this = this;

      this.log.debug("Click Up");
      rpio.open(this.pinOpen, rpio.OUTPUT, rpio.HIGH);
      setTimeout(function () {
        _this.log.debug("Unclick Up");

        rpio.open(_this.pinOpen, rpio.OUTPUT, rpio.LOW);
      }, 200);
    }
  }, {
    key: "pressClose",
    value: function pressClose() {
      var _this2 = this;

      this.log.debug("Click Down");
      rpio.open(this.pinClose, rpio.OUTPUT, rpio.HIGH);
      setTimeout(function () {
        _this2.log.debug("Unclick Down");

        rpio.open(_this2.pinClose, rpio.OUTPUT, rpio.LOW);
      }, 200);
    }
  }, {
    key: "getOpeningTime",
    value: function getOpeningTime(currentValue, targetValue, maneuverLength) {
      var diff = Math.abs(currentValue - targetValue) * 0.01;
      return maneuverLength * diff;
    }
    /**
     * Calculates time for the blind to go from value to value, or triggers a full opening/closing
     */

  }, {
    key: "maneuver",
    value: function maneuver(_ref) {
      var _this3 = this;

      var direction = _ref.direction,
          targetValue = _ref.targetValue;
      var currentValue = parseInt(BlindState.getState(this.id, "currentValue"), 10);
      this.log.debug("Blind ".concat(this.name, " Going ").concat(direction, " from ").concat(currentValue, " to ").concat(targetValue));

      if (direction === "up") {
        this.pressOpen();
      } else {
        this.pressClose();
      }

      BlindState.setState(this.id, "currentValue", targetValue);

      if (targetValue !== 0 && targetValue !== 100) {
        var length = parseInt(this.getOpeningTime(currentValue, targetValue, this.maneuverLength), 10);
        setTimeout(function () {
          if (direction === "up") {
            _this3.pressOpen();
          } else {
            _this3.pressClose();
          }

          _this3.log.debug("Blind up at value ".concat(targetValue, "%"));

          BlindState.setState(_this3.id, "currentValue", targetValue);
          BlindState.setState(_this3.id, "positionState", "stopped");
        }, length);
      } else {
        setTimeout(function () {
          _this3.log.debug("Blind up at value ".concat(targetValue, "%"));

          BlindState.setState(_this3.id, "currentValue", targetValue);
          BlindState.setState(_this3.id, "positionState", "stopped");
        }, this.maneuverLength + 2000);
      }
    }
    /**
     * Handle maneuver request
     */

  }, {
    key: "handleManeuverSelection",
    value: function handleManeuverSelection(targetValue) {
      var currentValue = parseInt(BlindState.getState(this.id, "currentValue"), 10);

      if (targetValue === 0 && currentValue !== 0) {
        BlindState.setState(this.id, "positionState", "decreasing");
        this.maneuver({
          direction: "down",
          targetValue: targetValue
        });
      } else if (targetValue === 100 && currentValue !== 100) {
        BlindState.setState(this.id, "positionState", "increasing");
        this.maneuver({
          direction: "up",
          targetValue: targetValue
        });
      } else if (targetValue > currentValue) {
        BlindState.setState(this.id, "positionState", "increasing");
        this.maneuver({
          direction: "up",
          targetValue: targetValue
        });
      } else if (targetValue < currentValue) {
        BlindState.setState(this.id, "positionState", "decreasing");
        this.maneuver({
          direction: "down",
          targetValue: targetValue
        });
      }
    }
  }, {
    key: "debounce",
    value: function debounce(func) {
      var _this4 = this;

      var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 500;
      var timer;
      return function () {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        clearTimeout(timer);
        timer = setTimeout(function () {
          func.apply(_this4, args);
        }, timeout);
      };
    }
    /**
     * Handle requests to set the "Target Position" characteristic
     */

  }, {
    key: "handleTargetPositionSet",
    value: function handleTargetPositionSet(targetValue) {
      this.log.debug("positionstate: ", BlindState.getState(this.id, "positionState"), ", currentValue :", BlindState.getState(this.id, "currentValue"));

      if (BlindState.getState(this.id, "positionState") === "stopped") {
        BlindState.setState(this.id, "targetValue", targetValue);
        this.handleManeuverSelection(targetValue);
      }
    }
  }]);
  return DeltaBlindAccessory;
}();

exports["default"] = DeltaBlindAccessory;

DeltaBlindAccessory.prototype.getServices = function () {
  return [this.service];
};