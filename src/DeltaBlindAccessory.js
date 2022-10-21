import * as BlindState from "./BlindState.js";
const debounce = require("debounce-promise");
const { exec } = require("child_process");

export default class DeltaBlindAccessory {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.id = config.id;

    this.log.debug("DeltaBlinds Accessory Plugin Loaded");

    this.Characteristic = this.api.hap.Characteristic;

    // extract name from config
    this.name = config.name;
    this.pinOpen = config.pinOpen;
    this.pinClose = config.pinClose;
    this.maneuverLength = config.maneuverLength * 1000;

    // create a new Window Covering service
    this.service = new this.api.hap.Service.WindowCovering(this.name);

    let self = this;
    let promiseSetter = function(fn) {
      let boundDebounced = debounce(fn.bind(self), 1000, {
        leading: false
      });
      return (value, next) => {
        boundDebounced(value, next);
      };
    };

    // create handlers for required characteristics
    this.service
      .getCharacteristic(this.Characteristic.CurrentPosition)
      .onGet(this.handleCurrentPositionGet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.PositionState)
      .onGet(this.handlePositionStateGet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.TargetPosition)
      .onGet(this.handleTargetPositionGet.bind(this))
      .onSet(promiseSetter(this.handleTargetPositionSet.bind(this)));
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
  handleCurrentPositionGet() {
    // set this to a valid value for CurrentPosition
    return parseInt(BlindState.getState(this.id, "currentValue"), 10);
  }

  /**
   * Handle requests to get the current value of the "Position State" characteristic
   */
  handlePositionStateGet() {
    const positionStateByValue = {
      increasing: this.Characteristic.PositionState.INCREASING,
      decreasing: this.Characteristic.PositionState.DECREASING,
      stopped: this.Characteristic.PositionState.STOPPED
    };

    const state = BlindState.getState(this.id, "positionState");
    // set this to a valid value for PositionState
    return positionStateByValue[state];
  }

  /**
   * Handle requests to get the current value of the "Target Position" characteristic
   */
  handleTargetPositionGet() {
    return BlindState.getState(this.id, "targetValue");
  }

  pressOpen() {
    this.log.debug("Click Up");
    exec(`i2cset -y 1 0x10 ${this.pinOpen} 0xFF`);
    setTimeout(() => {
      this.log.debug("Unclick Up");
      exec(`i2cset -y 1 0x10 ${this.pinOpen} 0x00`);
    }, 500);
  }

  pressClose() {
    this.log.debug("Click Down");
    exec(`i2cset -y 1 0x10 ${this.pinClose} 0xFF`);
    setTimeout(() => {
      this.log.debug("Unclick Down");
      exec(`i2cset -y 1 0x10 ${this.pinClose} 0x00`);
    }, 500);
  }

  getOpeningTime(currentValue, targetValue, maneuverLength) {
    const diff = Math.abs(currentValue - targetValue) * 0.01;
    return maneuverLength * diff;
  }

  /**
   * Calculates time for the blind to go from value to value, or triggers a full opening/closing
   */
  maneuver({ direction, targetValue }) {
    const currentValue = parseInt(
      BlindState.getState(this.id, "currentValue"),
      10
    );

    this.log.debug(
      `Blind ${this.name} Going ${direction} from ${currentValue} to ${targetValue}`
    );

    if (direction === "up") {
      this.pressOpen();
    } else {
      this.pressClose();
    }

    BlindState.setState(this.id, "currentValue", targetValue);

    if (targetValue !== 0 && targetValue !== 100) {
      const length = parseInt(
        this.getOpeningTime(currentValue, targetValue, this.maneuverLength),
        10
      );

      setTimeout(() => {
        if (direction === "up") {
          this.pressOpen();
        } else {
          this.pressClose();
        }
        this.log.debug(`Blind up at value ${targetValue}%`);
        BlindState.setState(this.id, "currentValue", targetValue);
        BlindState.setState(this.id, "positionState", "stopped");
      }, length);
    } else {
      setTimeout(() => {
        this.log.debug(`Blind up at value ${targetValue}%`);
        BlindState.setState(this.id, "currentValue", targetValue);
        BlindState.setState(this.id, "positionState", "stopped");
      }, this.maneuverLength + 2000);
    }
  }

  /**
   * Handle maneuver request
   */
  handleManeuverSelection(targetValue) {
    const currentValue = parseInt(
      BlindState.getState(this.id, "currentValue"),
      10
    );
    if (targetValue === 0 && currentValue !== 0) {
      BlindState.setState(this.id, "positionState", "decreasing");
      this.maneuver({ direction: "down", targetValue });
    } else if (targetValue === 100 && currentValue !== 100) {
      BlindState.setState(this.id, "positionState", "increasing");
      this.maneuver({ direction: "up", targetValue });
    } else if (targetValue > currentValue) {
      BlindState.setState(this.id, "positionState", "increasing");
      this.maneuver({ direction: "up", targetValue });
    } else if (targetValue < currentValue) {
      BlindState.setState(this.id, "positionState", "decreasing");
      this.maneuver({ direction: "down", targetValue });
    }
  }

  debounce(func, timeout = 500) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }

  /**
   * Handle requests to set the "Target Position" characteristic
   */
  handleTargetPositionSet(targetValue) {
    this.log.debug(
      "positionstate: ",
      BlindState.getState(this.id, "positionState"),
      ", currentValue :",
      BlindState.getState(this.id, "currentValue")
    );

    if (BlindState.getState(this.id, "positionState") === "stopped") {
      BlindState.setState(this.id, "targetValue", targetValue);
      this.handleManeuverSelection(targetValue);
    }
  }
}

DeltaBlindAccessory.prototype.getServices = function() {
  return [this.service];
};
