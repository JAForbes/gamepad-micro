(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GamepadMicro = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Copyright 2014 Christopher Dolphin. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author dolphin@likethemammal.com (Chris Dolphin)
 */

function GamepadMicro () {
    this._buttonNames = [
        'actionSouth',
        'actionEast',
        'actionWest',
        'actionNorth',
        'leftBumper',
        'rightBumper',
        'leftTrigger',
        'rightTrigger',
        'select',
        'start',
        'leftStick',
        'rightStick',
        'dPadUp',
        'dPadDown',
        'dPadLeft',
        'dPadRight'
    ];

    this.reset();
}

GamepadMicro.prototype.reset = function() {
    this._ticking = false;
    this._prevTimestamps = [];
    this._connectionListening = false;
    this._updateCallback = function() {};
    this._prevRawGamepadTypes = [];
    this.gamepadConnected = _getRawGamepads.length > 0;
    this.gamepadSupported = !!_gamepadSupported();
    this.gamepads = [];
};

function _newGamepad() {
    return {
        leftStick: { x: 0, y: 0 },
        rightStick: { x: 0, y: 0 },
        dPad:  { x: 0, y: 0 },
        buttons: {}
    }
}

GamepadMicro.prototype.onUpdate = function(callback) {
    this._updateCallback = callback;
    this._checkForEvents();
    this._setupPoll();
};

GamepadMicro.prototype.offUpdate = function() {
    this._shouldRemoveEvents();
    this._removePoll();
};

GamepadMicro.prototype.update = function() {
    this._updateCallback(this.gamepads);
};

GamepadMicro.prototype._checkForEvents = function() {
    if (!this._connectionListening) {
        window.addEventListener('gamepadconnected', this._onGamepadConnected.bind(this), false);
        window.addEventListener('gamepaddisconnected', this._onGamepadDisconnected.bind(this), false);
        this._connectionListening = true;
    }
};


GamepadMicro.prototype._shouldRemoveEvents = function() {
    if (this._connectionListening) {
        window.removeEventListener('gamepadconnected', this._onGamepadConnected.bind(this));
        window.removeEventListener('gamepaddisconnected', this._onGamepadDisconnected.bind(this));
        this._connectionListening = false;
    }
};

GamepadMicro.prototype._onGamepadConnected = function(ev) {
    var gamepad = ev.originalEvent.gamepad;
    if (gamepad.mapping === 'standard') {
        this.gamepads[gamepad.index] = _newGamepad();
        this.gamepadconnected = true;
        this.update();
    }
};

GamepadMicro.prototype._onGamepadDisconnected = function(ev) {
    var disconnectedGamepad = ev.originalEvent.gamepad;
    var gamepads = this.gamepads;

    gamepads.forEach(function (gamepad, index, array) {
        if (index === disconnectedGamepad.index) {
            gamepads.splice(index, 1);
        }
    });

    if (!gamepads.length) {
        this.gamepadconnected = false;
    }

    this.update();
};

function _getRawGamepads() {
    var gamepads = (navigator.getGamepads && navigator.getGamepads()) || (navigator.webkitGetGamepads && navigator.webkitGetGamepads());
    var standardGamepads = [];

    if (gamepads) {
        for (var i = 0, len = gamepads.length; i < len; i++) {
            var gp = gamepads[i];

            if (gp && gp.mapping === 'standard') {
                standardGamepads.push(gp);
            }
        }
    }

    return standardGamepads;
}

function _buttonPressed(gamepad, index) {
    if (!gamepad || !gamepad.buttons || index >= gamepad.buttons.length) {
        return false;
    }

    var b = gamepad.buttons[index];
    if (!b) {
        return false;
    }

    if (typeof(b) === "object") {
        return b.pressed;
    }

    return (b === 1.0);
}

GamepadMicro.prototype._checkForGamepadChange = function() {
    var rawGamepads = _getRawGamepads();
    var changed = false;

    for (var i = 0; i < rawGamepads.length; i++) {
        var gamepad = rawGamepads[i];

        // Don’t do anything if the current timestamp is the same as previous
        // one, which means that the state of the gamepad hasn’t changed.
        // This is only supported by Chrome right now, so the first check
        // makes sure we’re not doing anything if the timestamps are empty
        // or undefined.
        if (gamepad.timestamp && (gamepad.timestamp == this._prevTimestamps[i])) {
            continue;
        }

        this._prevTimestamps[i] = gamepad.timestamp;

        changed = true;
    }

    return (changed) ? rawGamepads : false;

};

GamepadMicro.prototype._poll = function() {
    var rawGamepads = this._checkForGamepadChange();

    if (!rawGamepads) {
        return;
    }

    this.gamepadConnected = true;
    this.gamepadSupported = true;

    var gamepadsChanged = false;
    var currentGamepads = this.gamepads;
    var buttonNames = this._buttonNames;

    for (var i = 0; i < rawGamepads.length; i++) {
        if (typeof rawGamepads[i] != this._prevRawGamepadTypes[i]) {
            gamepadsChanged = true;
            this._prevRawGamepadTypes[i] = typeof rawGamepads[i];
        }

        var currentRawGamepad = rawGamepads[i];

        if (currentRawGamepad) {
            var rawButtons = currentRawGamepad.buttons;
            var pressedButtons = [];
            var currentGamepad = currentGamepads[currentRawGamepad.index];

            for (var k = 0, len = buttonNames.length; k < len; k++) {

                var name = buttonNames[k];
                var button = rawButtons[name];
                var wasDown = !!currentGamepad.buttons[name];
                var isDown = button = _buttonPressed(currentRawGamepad, k);

                if (wasDown && !isDown) {
                    pressedButtons.push(name);
                }
            }

            currentGamepad.buttons = pressedButtons;

            // update the sticks
            currentGamepad.leftStick.x = currentRawGamepad.axes[0];
            currentGamepad.leftStick.y = currentRawGamepad.axes[1];
            currentGamepad.rightStick.x = currentRawGamepad.axes[2];
            currentGamepad.rightStick.y = currentRawGamepad.axes[3];

            // dpad isn't a true stick, infer from buttons
            currentGamepad.dpad.x = (currentGamepad.buttons.dpadLeft ? -1 : 0) + (currentGamepad.buttons.dpadRight ? 1 : 0);
            currentGamepad.dpad.y = (currentGamepad.buttons.dpadUp ? -1 : 0) + (currentGamepad.buttons.dpadDown ? 1 : 0);


            this.gamepads[currentRawGamepad.index] = currentGamepad;

        }
    }

    this.update();
};

GamepadMicro.prototype._setupPoll = function() {
    if (!this._ticking) {
        this._ticking = true;
        this._tick();
    }
};

GamepadMicro.prototype._tick = function() {
    var tickFunc = GamepadMicro.prototype._tick;

    this._poll();

    if (this._ticking) {
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(tickFunc);
        } else if (window.mozRequestAnimationFrame) {
            window.mozRequestAnimationFrame(tickFunc);
        } else if (window.webkitRequestAnimationFrame) {
            window.webkitRequestAnimationFrame(tickFunc);
        }
        // Note lack of setTimeout since all the browsers that support
        // Gamepad API are already supporting requestAnimationFrame().
    }
};

GamepadMicro.prototype._removePoll = function() {
    this._ticking = false;
};

function _gamepadSupported () {
    return navigator.getGamepads ||
        !!navigator.webkitGetGamepads ||
        !!navigator.webkitGamepads;
}

module.exports = GamepadMicro;
},{}]},{},[1])(1)
});