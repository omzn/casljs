/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({
/***/ 917:
/***/ ((module) => {
/*! terminal.js | https://github.com/eosterberg/terminaljs */
module.exports = (function () {

	var VERSION = '3.0.1';

	// PROMPT_TYPE
	var PROMPT_INPUT = 1, PROMPT_PASSWORD = 2, PROMPT_CONFIRM = 3;

	var firstPrompt = true;
	promptInput = function (terminalObj, message, PROMPT_TYPE, callback) {
		var shouldDisplayInput = (PROMPT_TYPE === PROMPT_INPUT || PROMPT_TYPE === PROMPT_CONFIRM);
		var inputField = document.createElement('input');

		inputField.style.position = 'absolute';
		inputField.style.zIndex = '-100';
		inputField.style.outline = 'none';
		inputField.style.border = 'none';
		inputField.style.opacity = '0';
		inputField.style.fontSize = '0.2em';

		terminalObj._inputLine.textContent = '';
		terminalObj._input.style.display = 'block';
		terminalObj.html.appendChild(inputField);
		terminalObj.fireCursorInterval(inputField);

		if (message.length) {
			terminalObj.print(PROMPT_TYPE === PROMPT_CONFIRM ? message + ' (y/n)' : message);
		}

		inputField.onblur = function () {
			terminalObj._cursor.style.display = 'none';
		}

		inputField.onfocus = function () {
			inputField.value = terminalObj._inputLine.textContent;
			terminalObj._cursor.style.display = 'inline';
		}

		terminalObj.html.onclick = function () {
			inputField.focus();
		}
		inputField.onkeydown = function (e) {
			if (e.code === 'ArrowUp' || e.code === 'ArrowRight' || e.code === 'ArrowLeft' || e.code === 'ArrowDown' || e.code === 'Tab') {
				e.preventDefault();
			}
		}
		inputField.onkeyup = function (e) {
			
			var inputValue = inputField.value;

			if (shouldDisplayInput && e.code !== 'Enter') {
				terminalObj._inputLine.textContent = inputField.value;
			}

			if (PROMPT_TYPE === PROMPT_CONFIRM && e.code !== 'Enter') {
				if (e.code !== 'KeyY' && e.code !== 'KeyN') { // PROMPT_CONFIRM accept only "Y" and "N" 
					terminalObj._inputLine.textContent = inputField.value = '';
					return;
				}
				if (terminalObj._inputLine.textContent.length > 1) { // PROMPT_CONFIRM accept only one character
					terminalObj._inputLine.textContent = inputField.value = terminalObj._inputLine.textContent.substr(-1);
				}
			}
			
			if (e.code === "Enter") {

				if (PROMPT_TYPE === PROMPT_CONFIRM) {
					if (!inputValue.length) { // PROMPT_CONFIRM doesn't accept empty string. It requires answer.
						return;		
					}
				}
				
				terminalObj._input.style.display = 'none';
				if (shouldDisplayInput) {
					terminalObj.print(inputValue);
				}
				
				if (typeof(callback) === 'function') {
					if (PROMPT_TYPE === PROMPT_CONFIRM) {
						if (inputValue.toUpperCase()[0] === 'Y') {
							callback(true);
						} else if (inputValue.toUpperCase()[0] === 'N') {
							callback(false);
						} else {
							throw `PROMPT_CONFIRM failed: Invalid input (${inputValue.toUpperCase()[0]}})`;
						}
					} else {
						callback(inputValue);
					}
					terminalObj.html.removeChild(inputField); // remove input field in the end of each callback	
					terminalObj.scrollBottom(); // scroll to the bottom of the terminal
				}

			}
		}
		inputField.focus();
	}


	var TerminalConstructor = function (containerId) {

		let terminalObj = this;

		this.html = document.createElement('div');
		this.html.className = 'Terminal';

		this._innerWindow = document.createElement('div');
		this._output = document.createElement('p');
		this._promptPS = document.createElement('span'); 
		this._inputLine = document.createElement('span'); //the span element where the users input is put
		this._cursor = document.createElement('span');
		this._input = document.createElement('p'); //the full element administering the user input, including cursor
		this._shouldBlinkCursor = true;

		this.cursorTimer;
		this.fireCursorInterval = function (inputField) {
			if (terminalObj.cursorTimer) { clearTimeout(terminalObj.cursorTimer); }
			terminalObj.cursorTimer = setTimeout(function () {
				if (inputField.parentElement && terminalObj._shouldBlinkCursor) {
					terminalObj._cursor.style.visibility = terminalObj._cursor.style.visibility === 'visible' ? 'hidden' : 'visible';
					terminalObj.fireCursorInterval(inputField);
				} else {
					terminalObj._cursor.style.visibility = 'visible';
				}
			}, 500);
		};

		this.scrollBottom = function() {
			this.html.scrollTop = this.html.scrollHeight;
		}

		this.print = function (message) {
			var newLine = document.createElement('div');
			newLine.textContent = message;
			this._output.appendChild(newLine);
			this.scrollBottom();
			return this;
		}

		this.input = function (message, callback) {
			promptInput(this, message, PROMPT_INPUT, callback);
			return this;
		}

		this.password = function (message, callback) {
			promptInput(this, message, PROMPT_PASSWORD, callback);
			return this;
		}

		this.confirm = function (message, callback) {
			promptInput(this, message, PROMPT_CONFIRM, callback);
			return this;
		}

		this.clear = function () {
			this._output.innerHTML = '';
			return this;
		}

		this.sleep = function (milliseconds, callback) {
			setTimeout(callback, milliseconds);
			return this;
		}

		this.setTextSize = function (size) {
			this._output.style.fontSize = size;
			this._input.style.fontSize = size;
			return this;
		}

		this.setTextColor = function (col) {
			this.html.style.color = col;
			this._cursor.style.background = col;
			return this;
		}

		this.setBackgroundColor = function (col) {
			this.html.style.background = col;
			return this;
		}

		this.setWidth = function (width) {
			this.html.style.width = width;
			return this;
		}

		this.setHeight = function (height) {
			this.html.style.height = height;
			return this;
		}

		this.blinkingCursor = function (bool) {
			bool = bool.toString().toUpperCase();
			this._shouldBlinkCursor = (bool === 'TRUE' || bool === '1' || bool === 'YES');
			return this;
		}

		this.setPrompt = function (promptPS) {
			this._promptPS.textContent = promptPS;
			return this;
		}

		this.getVersion = function() {
			console.info(`TerminalJS ${VERSION}`)
			return VERSION;
		}

		this._input.appendChild(this._promptPS);
		this._input.appendChild(this._inputLine);
		this._input.appendChild(this._cursor);
		this._innerWindow.appendChild(this._output);
		this._innerWindow.appendChild(this._input);
		this.html.appendChild(this._innerWindow);

		this.setBackgroundColor('black')
			.setTextColor('white')
			.setTextSize('1em')
			.setWidth('100%')
			.setHeight('100%');

		this.html.style.fontFamily = 'Ubuntu Mono, Monaco, Courier';
		this.html.style.margin = '0';
		this.html.style.overflow = 'auto';
		this.html.style.whiteSpace = 'pre';
		this._innerWindow.style.padding = '10px';
		this._input.style.margin = '0';
		this._output.style.margin = '0';
		this._cursor.style.background = 'white';
		this._cursor.innerHTML = 'C'; //put something in the cursor..
		this._cursor.style.display = 'none'; //then hide it
		this._input.style.display = 'none';

		if (typeof(containerId) === 'string') { 
			let container = document.getElementById(containerId);
			container.innerHTML = "";
			container.appendChild(this.html);
		} else {
			throw "terminal-js-emulator requires (string) parent container id in the constructor";
		}
	}

	return TerminalConstructor;
}())

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

/////

// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
	"use strict";



//// comet2

var VERSION = '0.1 kit (Dec 31, 2021)';
var DEBUG = 1;

var COMET2TBL = {
  // COMET instructions
  '0x00': {id: 'NOP', type: 'op4'},
  '0x10': {id: 'LD', type: 'op1'},
  '0x11': {id: 'ST', type: 'op1'},
  '0x12': {id: 'LAD', type: 'op1'},
  '0x14': {id: 'LD', type: 'op5'},
  '0x20': {id: 'ADDA', type: 'op1'},
  '0x21': {id: 'SUBA', type: 'op1'},
  '0x22': {id: 'ADDL', type: 'op1'},
  '0x23': {id: 'SUBL', type: 'op1'},
  '0x24': {id: 'ADDA', type: 'op5'},
  '0x25': {id: 'SUBA', type: 'op5'},
  '0x26': {id: 'ADDL', type: 'op5'},
  '0x27': {id: 'SUBL', type: 'op5'},
  '0x28': {id: 'MULA', type: 'op1'},
  '0x29': {id: 'DIVA', type: 'op1'},
  '0x2a': {id: 'MULL', type: 'op1'},
  '0x2b': {id: 'DIVL', type: 'op1'},
  '0x2c': {id: 'MULA', type: 'op5'},
  '0x2d': {id: 'DIVA', type: 'op5'},
  '0x2e': {id: 'MULL', type: 'op5'},
  '0x2f': {id: 'DIVL', type: 'op5'},
  '0x30': {id: 'AND', type: 'op1'},
  '0x31': {id: 'OR', type: 'op1'},
  '0x32': {id: 'XOR', type: 'op1'},
  '0x34': {id: 'AND', type: 'op5'},
  '0x35': {id: 'OR', type: 'op5'},
  '0x36': {id: 'XOR', type: 'op5'},
  '0x40': {id: 'CPA', type: 'op1'},
  '0x41': {id: 'CPL', type: 'op1'},
  '0x44': {id: 'CPA', type: 'op5'},
  '0x45': {id: 'CPL', type: 'op5'},
  '0x50': {id: 'SLA', type: 'op1'},
  '0x51': {id: 'SRA', type: 'op1'},
  '0x52': {id: 'SLL', type: 'op1'},
  '0x53': {id: 'SRL', type: 'op1'},
  '0x61': {id: 'JMI', type: 'op2'},
  '0x62': {id: 'JNZ', type: 'op2'},
  '0x63': {id: 'JZE', type: 'op2'},
  '0x64': {id: 'JUMP', type: 'op2'},
  '0x65': {id: 'JPL', type: 'op2'},
  '0x66': {id: 'JOV', type: 'op2'},
  '0x70': {id: 'PUSH', type: 'op2'},
  '0x71': {id: 'POP', type: 'op3'},
  '0x80': {id: 'CALL', type: 'op2'},
  '0x81': {id: 'RET', type: 'op4'},
  '0xf0': {id: 'SVC', type: 'op2'},
};

var CMDTBL = {
  'r|run': { subr : cmd_run,    list : 1 },
  's|step': { subr : cmd_step,   list : 1 },
//  'b|break'   : { subr : cmd_break,  list : 0 },
//  'd|delete'  : { subr : cmd_delete, list : 0 },
  'i|info'    : { subr : cmd_info,   list : 0 },
  'p|print'   : { subr : cmd_print,  list : 0 },
//  'du|dump'   : { subr : cmd_dump,   list : 0 },
//  'st|stack'  : { subr : cmd_stack,  list : 0 },
//  'f|file'    : { subr : cmd_file,   list : 1 },
//  'j|jump'    : { subr : cmd_jump,   list : 1 },
//  'm|memory'  : { subr : cmd_memory, list : 1 },
//  'di|disasm' : { subr : cmd_disasm, list : 0 },
  'h|help'    : { subr : cmd_help,   list : 0 },
};


var SYS_IN = 0xfff0;
var SYS_OUT = 0xfff2;

var FR_PLUS = 0;
var FR_ZERO = 1;
var FR_MINUS = 2;
var FR_OVER = 4;

// the top of the stack, which is the upper limit of the stack space.
var STACK_TOP = 0xff00;

// indices for the state list, state
var PC = 0;
var FR = 1;
var GR0 = 2;
var GR1 = 3;
var GR2 = 4;
var GR3 = 5;
var GR4 = 6;
var GR5 = 7;
var GR6 = 8;
var GR7 = 9;
var SP = 10;
var BP = 11;
// maximum/minimum of signed value
var MAX_SIGNED = 32767;
var MIN_SIGNED = -32768;

// memory image
var comet2mem = [
	4608,     5, 11264, 11264,
 11264,  4608,     5,  4624,
		 2, 11521,  4624,     0,
 11521, 33024
];
// PC, FR, GR0, GR1, GR2, GR3, GR4, GR5, GR6, GR7, SP, break points
var state = [0x0000, FR_ZERO, 0, 0, 0, 0, 0, 0, 0, 0, STACK_TOP, []];

var run_stop = 0;
var last_cmd;

function zeroPadding(val, len) {
  for (var i = 0; i < len; i++) {
    val = '0' + val;
  }
  return val.slice((-1) * len);
}

function unpack_C(string) {
  var ret = [];
  for (var i = 0; i < string.length; i++) {
    ret.push(string.charCodeAt(i));
  }
  return ret;
}

function hex(val,len) {
	return zeroPadding(val.toString(16),len);
}

function signed(val) {
  if (val >= 32768 && val < 65536) {
    val -= 65536;
  }
  return val;
}

function unsigned(val) {
  if (val >= -32768 && val < 0) {
    val += 65536;
  }
  return val;
}

function check_number(val) {
  var sval = String(val);
  if (sval && ((sval.match(/^[-+]?\d+/)) || sval.match(/^\#[\da-zA-Z]+/))) {
    return 1;
  } else {
    return null;
  }
}

function expand_number(val) {
  var sval = String(val);
  if (check_number(sval)) {
    var res;
    if (res = sval.match(/^\#(.*)/)) {
      val = parseInt(result[1], 16);
    }
    val &= 0xffff;  // truncate to 16 bits
    return val;
  } else {
    return null;
  }
}

function get_flag(val) {
  if (val & 0x8000) {
    return FR_MINUS;
  } else if (val == 0) {
    return FR_ZERO;
  } else {
    return FR_PLUS;
  }
}

function mem_get(memoryp, pc) {
  if (memoryp[pc]) {
    return memoryp[pc];
  } else {
    return 0;
  }
}

function mem_put(memoryp, pc, val) {
  memoryp[pc] = val;
}

function parse(memoryp, statep) {
  if (DEBUG) {
    console.log('parse(memoryp, statep)');
  }
  var pc = statep[PC];
  var inst = mem_get(memoryp, pc) >> 8;
  var gr = (mem_get(memoryp, pc) >> 4) & 0xf;
  var xr = mem_get(memoryp, pc) & 0xf;
  var adr = mem_get(memoryp, pc + 1);

  var inst_sym = 'DC';
  var opr_sym = '#' + zeroPadding(mem_get(memoryp, pc).toString(16), 4);
  var size = 1;
  var key = '0x' + zeroPadding(inst.toString(16), 2);

  if (COMET2TBL[key]) {
    inst_sym = COMET2TBL[key]['id'];
    var type = COMET2TBL[key]['type'];
    // instructions with GR, adr, and XR
    if (type == 'op1') {
      opr_sym = 'GR' + String(gr) + ', #' + zeroPadding(adr.toString(16));
      if (xr > 0) {
        opr_sym += ', GR' + String(xr);
      }
      size = 2;
      // instructions with adr and XR
    } else if (type == 'op2') {  //    # with adr, (XR)
      opr_sym = '#' + zeroPadding(adr.toString(16), 4);
      if (xr > 0) {
        opr_sym += ', GR' + xr;
      }
      size = 2;
      // instructions with GR
    } else if (type == 'op3') {  // only with GR
      opr_sym = 'GR' + String(gr);
      size = 1;
      // instructions without operand
    } else if (type == 'op4') {  // no operand
      opr_sym = '';
      size = 1;
      // instructions with GR and GR
    } else if (type == 'op5') {  // with GR, GR
      opr_sym = 'GR' + String(gr) + ', GR' + String(xr);
      size = 1;
    }
  }
  var results = [inst_sym, opr_sym, size];
  return results;
}

// Execute one instruction from the PC --- evaluate the intruction,
// update registers, and advance the PC by the instruction's size.
function step_exec(memoryp, statep) {
  if (DEBUG) {
    console.log('step_exec(' + memoryp + ',' + statep + ')');
  }
  // obtain the mnemonic and the operand for the current address
  var res = parse(memoryp, statep);
  var inst = res[0];
  var opr = res[1];

  var pc = statep[PC];
  var fr = statep[FR];
  var sp = statep[SP];
  var regs = statep.slice(GR0, GR7 + 1);

  var gr = (mem_get(memoryp, pc) >> 4) & 0xf;
  var xr = mem_get(memoryp, pc) & 0xf;
  var adr = mem_get(memoryp, pc + 1);
  var eadr = adr;

  var val;

  if (1 <= xr && xr <= 7) {
    eadr += regs[xr]
  }
  eadr &= 0xffff;

  if (inst == 'LD') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] = mem_get(memoryp, eadr);
      fr = get_flag(regs[gr]);
      pc += 2;
    } else {
      regs[gr] = regs[xr];
      fr = get_flag(regs[gr]);
      pc += 1;
    }

  } else if (inst == 'ST') {
    mem_put(memoryp, eadr, regs[gr]);
    pc += 2;

  } else if (inst == 'LAD') {
    regs[gr] = eadr;
    pc += 2;

  } else if (inst == 'ADDA') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] = signed(regs[gr]);
      regs[gr] += mem_get(memoryp, eadr);
      var ofr1 = regs[gr] > MAX_SIGNED ? FR_OVER : 0;
      var ofr2 = regs[gr] < MIN_SIGNED ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 2;

    } else {
      regs[gr] = signed(regs[gr]);
      regs[xr] = signed(regs[xr]);
      regs[gr] += regs[xr];
      var ofr1 = regs[gr] > MAX_SIGNED ? FR_OVER : 0;
      var ofr2 = regs[gr] < MIN_SIGNED ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      regs[xr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 1;
    }

  } else if (inst == 'SUBA') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] = signed(regs[gr]);
      regs[gr] -= mem_get(memoryp, eadr);
      var ofr1 = regs[gr] > MAX_SIGNED ? FR_OVER : 0;
      var ofr2 = regs[gr] < MIN_SIGNED ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 2;

    } else {
      regs[gr] = signed(regs[gr]);
      regs[xr] = signed(regs[xr]);
      regs[gr] -= regs[xr];
      var ofr1 = regs[gr] > MAX_SIGNED ? FR_OVER : 0;
      var ofr2 = regs[gr] < MIN_SIGNED ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      regs[xr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 1;
    }

  } else if (inst == 'ADDL') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] += mem_get(memoryp, eadr);
      var ofr1 = regs[gr] > 0xffff ? FR_OVER : 0;
      var ofr2 = regs[gr] < 0 ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 2;

    } else {
      regs[gr] += regs[xr];
      var ofr1 = regs[gr] > 0xffff ? FR_OVER : 0;
      var ofr2 = regs[gr] < 0 ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 1;
    }

  } else if (inst == 'SUBL') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] -= mem_get(memoryp, eadr);
      var ofr1 = regs[gr] > 0xffff ? FR_OVER : 0;
      var ofr2 = regs[gr] < 0 ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 2;
    } else {
      regs[gr] -= regs[xr];
      var ofr1 = regs[gr] > 0xffff ? FR_OVER : 0;
      var ofr2 = regs[gr] < 0 ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 1;
    }

  } else if (inst == 'MULA') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] = signed(regs[gr]);
      regs[gr] *= mem_get(memoryp, eadr);
      var ofr1 = regs[gr] > MAX_SIGNED ? FR_OVER : 0;
      var ofr2 = regs[gr] < MIN_SIGNED ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 2;

    } else {
      regs[gr] = signed(regs[gr]);
      regs[xr] = signed(regs[xr]);
      regs[gr] *= regs[xr];
      var ofr1 = regs[gr] > MAX_SIGNED ? FR_OVER : 0;
      var ofr2 = regs[gr] < MIN_SIGNED ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      regs[xr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 1;
    }
  } else if (inst == 'MULL') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] *= mem_get(memoryp, eadr);
      var ofr1 = regs[gr] > 0xffff ? FR_OVER : 0;
      var ofr2 = regs[gr] < 0 ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 2;
    } else {
      regs[gr] *= regs[xr];
      var ofr1 = regs[gr] > 0xffff ? FR_OVER : 0;
      var ofr2 = regs[gr] < 0 ? FR_OVER : 0;
      regs[gr] &= 0xffff;
      regs[xr] &= 0xffff;
      fr = get_flag(regs[gr]) | ofr1 | ofr2;
      pc += 1;
    }
  } else if (inst == 'DIVA') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] = signed(regs[gr]);
      var m = mem_get(memoryp, eadr);
      if (m == 0) {
        fr = FR_OVER | FR_ZERO;
      } else {
        regs[gr] /= m;
        var ofr1 = regs[gr] > MAX_SIGNED ? FR_OVER : 0;
        var ofr2 = regs[gr] < MIN_SIGNED ? FR_OVER : 0;
        regs[gr] &= 0xffff;
        regs[gr] &= 0xffff;
        fr = get_flag(regs[gr]) | ofr1 | ofr2;
      }
      pc += 2;
    } else {
      regs[gr] = signed(regs[gr]);
      regs[xr] = signed(regs[xr]);
      if (regs[xr] == 0) {
        fr = FR_OVER | FR_ZERO;
      } else {
        regs[gr] /= regs[xr];
        var ofr1 = regs[gr] > MAX_SIGNED ? FR_OVER : 0;
        var ofr2 = regs[gr] < MIN_SIGNED ? FR_OVER : 0;
        regs[gr] &= 0xffff;
        regs[xr] &= 0xffff;
        fr = get_flag(regs[gr]) | ofr1 | ofr2;
      }
      pc += 1;
    }
  } else if (inst == 'DIVL') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      var m = mem_get(memoryp, eadr);
      if (m == 0) {
        fr = FR_OVER | FR_ZERO;
      } else {
        regs[gr] /= m;
        var ofr1 = regs[gr] > 0xffff ? FR_OVER : 0;
        var ofr2 = regs[gr] < 0 ? FR_OVER : 0;
        regs[gr] &= 0xffff;
        fr = get_flag(regs[gr]) | ofr1 | ofr2;
      }
      pc += 2;
    } else {
      if (regs[xr] == 0) {
        fr = FR_OVER | FR_ZERO;
      } else {
        regs[gr] /= regs[xr];
        var ofr1 = regs[gr] > 0xffff ? FR_OVER : 0;
        var ofr2 = regs[gr] < 0 ? FR_OVER : 0;
        regs[gr] &= 0xffff;
        regs[xr] &= 0xffff;
        fr = get_flag(regs[gr]) | ofr1 | ofr2;
      }
      pc += 1;
    }
  } else if (inst == 'AND') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] &= mem_get(memoryp, eadr);
      fr = get_flag(regs[gr]);
      pc += 2;

    } else {
      regs[gr] &= regs[xr];
      fr = get_flag(regs[gr]);
      pc += 1;
    }

  } else if (inst == 'OR') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] |= mem_get(memoryp, eadr);
      fr = get_flag(regs[gr]);
      pc += 2;

    } else {
      regs[gr] |= regs[xr];
      fr = get_flag(regs[gr]);
      pc += 1;
    }

  } else if (inst == 'XOR') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      regs[gr] ^= mem_get(memoryp, eadr);
      fr = get_flag(regs[gr]);
      pc += 2;

    } else {
      regs[gr] ^= regs[xr];
      fr = get_flag(regs[gr]);
      pc += 1;
    }

  } else if (inst == 'CPA') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      val = signed(regs[gr]) - signed(mem_get(memoryp, eadr));
      if (val > MAX_SIGNED) {
        val = MAX_SIGNED;
      }
      if (val < MIN_SIGNED) {
        val = MIN_SIGNED;
      }
      fr = get_flag(unsigned(_));
      pc += 2;

    } else {
      val = signed(regs[gr]) - signed(regs[xr]);
      if (val > MAX_SIGNED) {
        val = MAX_SIGNED;
      }
      if (val < MIN_SIGNED) {
        val = MIN_SIGNED;
      }
      fr = get_flag(unsigned(_));
      pc += 1;
    }

  } else if (inst == 'CPL') {
    if (!opr.match(/GR[0-7], GR[0-7]/)) {
      val = regs[gr] - mem_get(memoryp, eadr);
      if (val > MAX_SIGNED) {
        val = MAX_SIGNED;
      }
      if (val < MIN_SIGNED) {
        val = MIN_SIGNED;
      }
      fr = get_flag(unsigned(_));
      pc += 2;
    } else {
      val = regs[gr] - regs[xr];
      if (val > MAX_SIGNED) {
        val = MAX_SIGNED;
      }
      if (val < MIN_SIGNED) {
        val = MIN_SIGNED;
      }
      fr = get_flag(unsigned(_));
      pc += 1;
    }

  } else if (inst == 'SLA') {
    val = regs[gr] & 0x8000;
    regs[gr] <<= eadr;
    var ofr = regs[gr] & 0x8000;
    ofr >>= 13;
    regs[gr] |= val;
    regs[gr] &= 0xffff;
    fr = get_flag(regs[gr]) | ofr;
    pc += 2;

  } else if (inst == 'SRA') {
    val = regs[gr];
    var ofr = regs[gr] & (0x0001 << (eadr - 1));
    ofr <<= (2 - (eadr - 1));
    if (val & 0x8000) {
      val &= 0x7fff;
      val >>= eadr;
      val += ((0x7fff >> eadr) ^ 0xffff);
    } else {
      val >>= eadr;
    }
    regs[gr] = val;
    fr = get_flag(regs[gr]) | ofr;
    pc += 2;

  } else if (inst == 'SLL') {
    regs[gr] <<= eadr;
    var ofr = regs[gr] & 0x10000;
    ofr >>= 14;
    regs[gr] &= 0xffff;
    fr = get_flag(regs[gr]) | ofr;
    pc += 2;

  } else if (inst == 'SRL') {
    var ofr = regs[gr] & (0x0001 << (eadr - 1));
    ofr <<= 2 - (eadr - 1);
    regs[gr] >>= eadr;
    fr = get_flag(regs[gr]) | ofr;
    pc += 2;

    //    } else if (inst == 'JPZ') {
    //	pc = (fr != FR_MINUS) ? eadr : (pc + 2);

  } else if (inst == 'JMI') {
    pc = ((fr & FR_MINUS) == FR_MINUS) ? eadr : (pc + 2);

  } else if (inst == 'JNZ') {
    pc = ((fr & FR_ZERO) != FR_ZERO) ? eadr : (pc + 2);

  } else if (inst == 'JZE') {
    pc = ((fr & FR_ZERO) == FR_ZERO) ? eadr : (pc + 2);

  } else if (inst == 'JUMP') {
    pc = eadr;

  } else if (inst == 'JPL') {
    pc = (((fr & FR_MINUS) != FR_MINUS) && ((fr & FR_ZERO) != FR_ZERO)) ?
        eadr :
        (pc + 2);

  } else if (inst == 'JOV') {
    pc = ((fr & FR_OVER) != 0) ? eadr : (pc + 2);

  } else if (inst == 'PUSH') {
    sp--;
    mem_put(memoryp, sp, eadr);
    pc += 2;

  } else if (inst == 'POP') {
    regs[gr] = mem_get(memoryp, sp);
    sp++;
    pc += 1;

  } else if (inst == 'CALL') {
    sp--;
    mem_put(memoryp, sp, pc + 2);
    pc = eadr;

  } else if (inst == 'RET') {
    pc = mem_get(memoryp, sp);
    sp++;
    if (sp > STACK_TOP) {  // RET on main routine
      //            exit 1;
      //[TODO] finish
    }

  } else if (inst == 'SVC') {
    if (eadr == SYS_IN) {
//      exec_in(memoryp, statep);
    } else if (eadr == SYS_OUT) {
//      exec_out(memoryp, statep);
    }
    pc += 2;

  } else if (inst == 'NOP') {
    pc++;

  } else {
    throw (`Illegal instruction ${inst} at #${ zeroPadding(hex(pc), 4)}`);
  }

  // update registers
  statep[PC] = pc;
  statep[FR] = fr;
  statep[SP] = sp;
  for (var i = GR0; i <= GR7; i++) {
    statep[i] = regs[i - GR0];
  }
}


function cmd_run() {

}

function cmd_step(memoryp, statep, arg) {
  if (DEBUG) {
    console.log('cmd_step(' + memoryp + ',' + statep + ',' + arg + ')');
  }
	var count = 1;	
	if (arg != []) { 
	  count = expand_number(arg);
  	if (!count) {
    	count = 1;
  	}
	}
  for (var i = 1; i <= count; i++) {
    step_exec(memoryp, statep);
  }
}

function cmd_info() {
	
}
function cmd_print(memoryp, statep, arg) {
  if (DEBUG) {
    console.log('cmd_print(' + memoryp + ',' + statep + ',' + arg + ')');
  }

  var pc   = statep[PC];
  var fr   = statep[FR];
  var sp   = statep[SP];
  var regs = statep.slice(GR0,GR7+1);
  if (DEBUG) {
    console.log(`statep[ ${statep} ]`);
    console.log('regs[' + regs + ']');
  }

  // obtain instruction and operand at current PC
  var res = parse( memoryp, statep );
  var inst = res[0];
  var opr = res[1];
 
  cometprint("");
  cometprint(`PR  #${hex(pc,4)} [ ${inst} ${opr} ]`);
  var fr_str = ((fr >> 2) % 2).toString() + ((fr > 2) % 2).toString()  + (fr % 2).toString();  
  cometprint(`SP  #${hex(sp,4)}(${ signed(sp) })    FR  ${fr_str}  (${fr})`);
  cometprint(`GR0 #${hex(regs[0],4)}(${ signed(regs[0]) })  GR1 #${hex(regs[1],4)}(${ signed(regs[1]) })  GR2 #${hex(regs[2],4)}(${ signed(regs[2]) })  GR3 #${hex(regs[3],4)}(${ signed(regs[3]) })`);
  cometprint(`GR4 #${hex(regs[4],4)}(${ signed(regs[4]) })  GR5 #${hex(regs[5],4)}(${ signed(regs[5]) })  GR6 #${hex(regs[6],4)}(${ signed(regs[6]) })  GR7 #${hex(regs[7],4)}(${ signed(regs[7]) })`);
}

function cmd_help ( memoryp, statep, args ) {
  if (DEBUG) {
    console.log('cmd_help');
  }

  cometprint("List of commands:");
  cometprint("r,  run		Start execution of program.");
  cometprint("s,  step	Step execution.  Argument N means do this N times.");
  cometprint("b,  break	Set a breakpoint at specified address.");
  cometprint("d,  delete	Delete some breakpoints.");
  cometprint("i,  info        Print information on breakpoints.");
  cometprint("p,  print	Print status of PC/FR/SP/GR0..GR7 registers.");
  cometprint("du, dump	Dump 128 words of memory image from specified address.");
  cometprint("st, stack	Dump 128 words of stack image.");
  cometprint("f,  file	Use FILE as program to be debugged.");
  cometprint("j,  jump	Continue program at specifed address.");
  cometprint("m,  memory	Change the memory at ADDRESS to VALUE.");
  cometprint("di, disasm      Disassemble 32 words from specified address.");
  cometprint("h,  help	Print list of commands.");
  cometprint("q,  quit	Exit comet.");
}


////// terminal

/* harmony import */ var terminal_js_emulator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(917);
/* harmony import */ var terminal_js_emulator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(terminal_js_emulator__WEBPACK_IMPORTED_MODULE_0__);
let t1 = new (terminal_js_emulator__WEBPACK_IMPORTED_MODULE_0___default())('terminal-1');
t1  
.setHeight("480px")
.setPrompt("comet2> ");
let terminal1 = function() {
    t1
        .input(``, function (cmd) {
						if (cmd == '') {
							cmd = last_cmd;
						} else {
							last_cmd = cmd;
						}
						var cmds = cmd.replace(/\s+/,' ').split(' ');
						cmd = cmds.shift();
						var found = 0;
						for (const key in CMDTBL) {
							if (cmd.match('^('+key+')$')) {
								CMDTBL[key].subr(comet2mem,state,cmds);
								//t1.print(`command - ${key}`);
								if (CMDTBL[key].list) {
									cmd_print(comet2mem,state,cmds);
								}
								found = 1;
							}
						}
						if (!found) {
							t1.print(`Undefined command "${cmd}". Try "help".`);
						}

						terminal1();
					});
//        document.getElementById('version').innerHTML = t1.getVersion();
}

function cometprint(msg) {
	t1.print(msg);	
}

terminal1();
// refresh buttons
document.getElementById("terminal-refresh").addEventListener("click", function() {
    terminal1();
});

})();

/******/ })()
;