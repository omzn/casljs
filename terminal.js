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

//// Both casl2 and commet2

var VERSION = '0.2 kit js (June 30, 2022)';
var DEBUG = 1;
var DDEBUG = 0;

// addresses of IN/OUT system calls --- these MACROs are expanded
// to call this address after pushing its arguments on stack.
var SYS_IN = 0xfff0;
var SYS_OUT = 0xfff2;

//// casl2

var CASL2TBL = {
  'NOP': {code: 0x00, type: 'op4'},
  'LD': {code: 0x10, type: 'op5'},
  'ST': {code: 0x11, type: 'op1'},
  'LAD': {code: 0x12, type: 'op1'},
  'ADDA': {code: 0x20, type: 'op5'},
  'SUBA': {code: 0x21, type: 'op5'},
  'ADDL': {code: 0x22, type: 'op5'},
  'SUBL': {code: 0x23, type: 'op5'},
  'MULA': {code: 0x28, type: 'op5'},
  'DIVA': {code: 0x29, type: 'op5'},
  'MULL': {code: 0x2A, type: 'op5'},
  'DIVL': {code: 0x2B, type: 'op5'},
  'AND': {code: 0x30, type: 'op5'},
  'OR': {code: 0x31, type: 'op5'},
  'XOR': {code: 0x32, type: 'op5'},
  'CPA': {code: 0x40, type: 'op5'},
  'CPL': {code: 0x41, type: 'op5'},
  'SLA': {code: 0x50, type: 'op1'},
  'SRA': {code: 0x51, type: 'op1'},
  'SLL': {code: 0x52, type: 'op1'},
  'SRL': {code: 0x53, type: 'op1'},
  'JMI': {code: 0x61, type: 'op2'},
  'JNZ': {code: 0x62, type: 'op2'},
  'JZE': {code: 0x63, type: 'op2'},
  'JUMP': {code: 0x64, type: 'op2'},
  'JPL': {code: 0x65, type: 'op2'},
  'JOV': {code: 0x66, type: 'op2'},
  'PUSH': {code: 0x70, type: 'op2'},
  'POP': {code: 0x71, type: 'op3'},
  'CALL': {code: 0x80, type: 'op2'},
  'RET': {code: 0x81, type: 'op4'},
  'SVC': {code: 0xf0, type: 'op2'},
  // psude instruction
  'START': {type: 'start'},
  'END': {type: 'end'},
  'DS': {type: 'ds'},
  'DC': {type: 'dc'},
  // CASL II macros
  'IN': {type: 'in'},
  'OUT': {type: 'out'},
  'RPUSH': {type: 'rpush'},
  'RPOP': {type: 'rpop'},
};

// global variables of currently processing file and line number.
// These variables are used in &error.
var __file = '';
var __line;

// global variables for START address checking
var actual_label = '';
var virtual_label = '';
var first_start = 1;
var var_scope = '';

var memory = {};
var symtbl = {};
var buf = [];
var outdump = [];
var outref = [];

var opt_a = 1;

var comet2ops = [];

function getCasl2Src() {
	var text = document.getElementById("casl2src").value;
	return text;
}

const assemble = () => {
  try {
//    const fs = require('fs');
//    const inputFilepath = process.argv[2];
//    const casl2code = fs.readFileSync(inputFilepath, 'utf-8');
		var casl2code = getCasl2Src();
//    console.log(casl2code);
    pass1(casl2code, symtbl, memory, buf);
    pass2(comet2ops, symtbl, memory, buf);
    // fs.writeFileSync(outputFilepath, data);
    // console.log(`Write to ${outputFilepath}`);
		comet2mem = comet2ops;
		comet2init();
  } catch (e) {
    //エラー処理
    caslprint(e);
	}
  //  console.log(memory);
  //  console.log(symtbl);
  // console.log(comet2ops);
	//comet2mem = comet2ops;
};

function unpack_C(string) {
  var ret = [];
  for (var i = 0; i < string.length; i++) {
    ret.push(string.charCodeAt(i));
  }
  return ret;
}

function isString(obj) {
  return typeof (obj) == 'string' || obj instanceof String;
}

function zeroPadding(val, len) {
  for (var i = 0; i < len; i++) {
    val = '0' + val;
  }
  return val.slice((-1) * len);
}

function spacePadding(val, len) {
  for (var i = 0; i < len; i++) {
    val = ' ' + val;
  }
  return val.slice((-1) * len);
}

function error(msg) {
  //  try {
  //  throw(__file + ':' + String(__line) + ':' + msg);
  throw ('Line ' + String(__line) + ':' + msg);
  //  } catch (e) {
  //    console.log(e.message);
  //  }
}

function check_label(label) {
  if (DEBUG) {
    console.log('check_label(' + label + ')');
  }
  if (!label.match(/^[A-Z][0-9A-Za-z]{0,7}$/)) {
    error('Invalid label "' + label + '"');
  }
}

// Expand the string VAL to corresponding decimal number --- symbol is
// resolved and hexadecimal number is converted to decimal.
function expand_label(hashref, val) {
  if (DEBUG) {
    console.log('expand_label(' + String(val) + ')');
  }
  var result, nval;
  if (isString(val)) {
    if (result = val.match(/^\#([\da-f][\da-f][\da-f][\da-f])$/i)) {
      nval = parseInt(result[1], 16)  // convert hex to decimal
    } else if (val in hashref) {
      nval = hashref[val]['val'];
    } else if (result = val.match(/^CALL_(.*)$/)) {
      var lbl = result[1];
      if (lbl in hashref) {
        nval = hashref[lbl]['val'];
      } else if (result = val.match(/\.([A-Za-z\d]+)$/)) {
        var k = result[1] + '.' + result[1];
        if (hashref[k]) {
          nval = hashref[k]['val'];
        }
      }
    } else if (!val.match(/^[+-]?\d+$/)) {
      var sym = val;
      if (result = val.match(/([A-Za-z\d]+)\.([A-Za-z\d]+)$/)) {
        if (result[1] == result[2]) {
          sym = result[2];
        } else {
          sym = result[2] + ' in routine ' + result[1];
        }
      }
      error('Undefined symbol "' + sym + '"');
    } else {
      nval = val;
    }
  } else {
    nval = val;
  }
  nval &= 0xffff;
  return nval;
}

// Register a label LABEL in the symbol table HASHREF with the value
// VAL.  If LABEL is already defined, display error and exit.
function add_label(hashref, label, val) {
  check_label(label);
  // On addition of a label, add var_scope.
  var uniq_label = var_scope + '.' + label;
  if (hashref[uniq_label]) {
    error('Label "' + label + '" already defined');
  }
  hashref[uniq_label] = {'val': val, 'file': __file, 'line': __line};

  if (DEBUG) {
    console.log('add_label(' + uniq_label + ':' + val + ')');
  }
}

// Update a label LABEL in the symbol table HASHREF into the value
// VAL.  If LABEL has not defined yet, display error and exit.
function update_label(hashref, label, val) {
  check_label(label);
  var uniq_label = var_scope + '.' + label;
  if (!hashref[uniq_label]) {
    error('Label "' + label + '" is not defined');
  }
  hashref[uniq_label] = {'val': val, 'file': __file, 'line': __line};

  if (DEBUG) {
    console.log('update_label(' + uniq_label + ':' + val + ')');
  }
}

// Register a literal in the symbol table HASHREF with the value
// VAL.
function add_literal(hashref, literal, val) {
  // check_literal($literal);
  hashref[literal] = {'val': val, 'file': __file, 'line': __line};
  if (DEBUG) {
    console.log('add_literal(' + val + ')');
  }
}

// Check the validity of decimal number NUMBER. If not valid, display
// error and exit.
function check_decimal(number) {
  if (DEBUG) {
    console.log('check_decimal(' + number + ')');
  }
  if (isNaN(Number(number))) {
    error('"' + number + '" must be decimal');
  }
}

// Check the validity of register REGISTER.  Return the register number
// (0 - 7). If not valid, display error and exit.  Otherwise,
function check_register(register) {
  var sregister = String(register);
  if (DEBUG) {
    console.log('check_register(' + sregister + ')');
  }
  var result = sregister.match(/^(GR)?([0-7])$/);
  if (!result) {
    error('Invalid register "' + sregister + '"');
  } else {
    return parseInt(result[2]);
  }
}

// Generate a one-byte code of VAL at ADDRESS in HASHREF.
function gen_code1(hashref, address, val) {
  if (isString(val)) {
    var result;
    if (result = val.match(/^\#([\da-f][\da-f][\da-f][\da-f])$/i)) {
      hashref[String(address)] = {
        'val': parseInt(result[1], 16),
        'file': __file,
        'line': __line
      };
      return;
    } else if (val.match(/^\d+$/i)) {
      hashref[String(address)] = {
        'val': Number(val),
        'file': __file,
        'line': __line
      };
      return;
    }
  }
  hashref[String(address)] = {'val': val, 'file': __file, 'line': __line};
}

// Generate two-byte codes from CODE, GR, ADR, and XR at ADDRESS in
// HASHREF.
function gen_code2(hashref, address, code, gr, adr, xr) {
  var ngr = check_register(gr);
  var nxr = check_register(xr);
  var val = (code << 8) + (ngr << 4) + nxr;
  hashref[String(address)] = {'val': val, 'file': __file, 'line': __line};
  address++;

  if (isString(adr)) {
    var result;
    if (result = adr.match(/^\#([\da-f][\da-f][\da-f][\da-f])$/i)) {
      hashref[String(address)] = {
        'val': parseInt(result[1], 16),
        'file': __file,
        'line': __line
      };
      return;
    }
  }
  hashref[String(address)] = {'val': adr, 'file': __file, 'line': __line};
}

function gen_code3(hashref, address, code, gr1, gr2) {
  var ngr1 = check_register(gr1);
  var ngr2 = check_register(gr2);

  var val = (code << 8) + (ngr1 << 4) + ngr2;
  hashref[String(address)] = {'val': val, 'file': __file, 'line': __line};
}

function pass1(source, symtblp, memoryp, bufp) {
  var in_block;
  var label;
  var inst;
  var opr;
  var address = 0;
  var literal_stack = [];

  var lines = source.split('\n');
  __line = 0;
  for (var i = 0; i < lines.length; i++) {
    __line++;
    if (DEBUG) {
      console.log(String(__line) + ':' + lines[i]);
    }
    lines[i] = lines[i].replace(/\r?\n/g, '');

    // remove comment --- take care of ``;'' between single quotes.
    var result;
    if (result = lines[i].match(/(^[^;]*\'[^\']*\'.*?)(;.*)?$/)) {
      lines[i] = result[1];
    } else {
      lines[i] = lines[i].replace(/;.*$/, '');
    }
    // remove trailing spaces
    lines[i] = lines[i].replace(/\s+$/, '');

    // skip to next line if neither label nor instruction is specified.
    if (lines[i].match(/^\s*$/)) {
      continue;
    }

    // extract each field
    if (result = lines[i].match(/^(\S+)?\s+([A-Z]+)(\s+(.*)?)?$/)) {
      label = result[1];
      inst = result[2];
      opr = result[4];

      if (!label) label = '';
      if (!inst) inst = '';
      if (!opr) opr = '';

      if (DEBUG) {
        console.log('label/inst/opr =' + label + '/' + inst + '/' + opr);
      }
    } else {
      error('Syntax error:' + lines[i]);
    }
    // keep every line in @buf for later use
    var uniq_label;
    if (label != '') {
      uniq_label = var_scope + '.' + label;
    } else {
      uniq_label = '';
    }
    bufp[i] = uniq_label + '\t' + inst + '\t' + opr;

    // register label to the symbol table
    if (label && in_block) {
      add_label(symtblp, label, address);

      // check if label is referred from START instruction.
      // if so, update the address of START's label
      if (label == actual_label) {
        update_label(symtblp, virtual_label, address);
        actual_label = 0;
      }
    }

    // generate object code according the type of instruction
    if (inst) {
      if (!CASL2TBL[inst]) {
        error('Illegal instruction "' + inst + '"');
      }

      var type = CASL2TBL[inst]['type'];

      // var opr = opr.split(/,\s*/);
      // replacement of above split
      var opr_array = [];
      if (!opr.match(/^\s*$/)) {
        var j = 0;
        var opid = 0;
        var ophead = 0;
        var mode = 'opr';
        while (opid < opr.length) {
          // search , as a separator of operand
          if (mode == 'opr' && opr.substring(opid, opid + 1) == ',') {
            // oprand mode
            opr_array[j] = opr.substring(ophead, opid);
            j++;
            ophead = opid + 1;
          } else if (mode == 'opr' && opr.substring(opid, opid + 1) == '\'') {
            // string mode
            mode = 'str';
          } else if (
              mode == 'str' && opr.substring(opr, opid, opid + 1) == '\'') {
            if (opr.substring(opr, opid, 2) == '\'\'') {
              opid += 2;
              continue;
            } else {
              mode = 'opr';
            }
          }
          opid++;
        }
        opr_array[j] = opr.substring(ophead);

        for (var k = 0; k < opr_array.length; k++) {
          opr_array[k] = opr_array[k].trim();
          if (DDEBUG) {
            console.log(opr_array[k] + ':');
          }
        }
      }

      // accurately, this definition is wrong in CASL II
      // DC 'hogehoge, hugahuga.'
      // DC 'h' ',ogehoge, hugahuga.'
      // LD GR1, = ','

      // START must be the first instruction
      if (!in_block && (type != 'start')) {
        error('NO "START" instruction found');
      }

      // GR0 cannot be used as an index register.
      if (opr_array[2] && opr_array[2].match(/^(GR)?0$/)) {
        error('Can\'t use GR0 as an index register');
      }

      // instructions with GR, adr, and optional XR
      if (type == 'op1') {
        if (!(opr_array.length >= 2 && opr_array.length <= 3)) {
          error('Invalid operand "' + opr + '"');
        }
        if (!opr_array[2]) {
          opr_array[2] = 0
        };
        if (opr_array[1].match(/=.+/)) {
          var ss = opr_array[1];
          ss = ss.replace(/\\/g, '\\\\');
          ss = ss.replace(/\+/g, '\\\+');
          ss = ss.replace(/\*/g, '\\\*');
          ss = ss.replace(/\?/g, '\\\?');
          ss = ss.replace(/\./g, '\\\.');
          ss = ss.replace(/\(/g, '\\\(');
          ss = ss.replace(/\)/g, '\\\)');
          ss = ss.replace(/\[/g, '\\\[');
          ss = ss.replace(/\]/g, '\\\]');
          ss = ss.replace(/\{/g, '\\\{');
          ss = ss.replace(/\}/g, '\\\}');
          ss = ss.replace(/\|/g, '\\\|');

          var isLiteral = 0;
          for (var j = 0; j < literal_stack.length; j++) {
            if (literal_stack[j] == ss) {
              isLiteral = 1;
              break;
            }
          }
          if (!isLiteral) {
            literal_stack.push(opr_array[1]);
          }
          if (DEBUG) {
            console.log('Literal:' + opr_array[1]);
          }
        } else if (
            opr_array[1].match(/^[A-Z][a-zA-Z0-9]*/) &&
            !opr_array[1].match(/^GR[0-7]$/)) {
          opr_array[1] = var_scope + '.' + opr_array[1];
        }
        gen_code2(
            memoryp, address, CASL2TBL[inst]['code'], opr_array[0], opr_array[1],
            opr_array[2]);
        address += 2;
        // instructions with adr, and optional XR
      } else if (type == 'op2') {
        if (!(1 <= opr_array.length && opr_array.length <= 2)) {
          error('Invalid operand "' + opr + '"');
        }
        if (opr_array[1] && opr_array[1].match(/^(GR)?0$/)) {
          error('Can\'t use GR0 as an index register');
        }

        if (!opr_array[1]) {
          opr_array[1] = 0;
        }

        if (!opr_array[0].match(/^GR[0-7]$/) &&
            opr_array[0].match(/^[A-Z][a-zA-Z0-9]*/)) {
          if (inst.match(/CALL/i)) {
            opr_array[0] = 'CALL_' + var_scope + '.' + opr_array[0];
          } else {
            opr_array[0] = var_scope + '.' + opr_array[0];
          }
        }
        gen_code2(
            memoryp, address, CASL2TBL[inst]['code'], 0, opr_array[0],
            opr_array[1]);
        address += 2;
        // instructions only with optional GR
      } else if (type == 'op3') {
        if (opr_array.length == 1) {
          error('Invalid operand "' + opr + '"');
        }
        gen_code3(memoryp, address, CASL2TBL[inst]['code'], opr_array[0], 0);
        address++;
        // instructions without operand
      } else if (type == 'op4') {
        if (opr_array.length) {
          error('Invalid operand "' + opr + '"');
        }
        gen_code1(memoryp, address, (CASL2TBL[inst]['code'] << 8));
        address++;

        // instructions with (GR, adr, and optional XR), or (GR, GR)
      } else if (type == 'op5') {
        if (!(opr_array.length >= 2 && opr_array.length <= 3)) {
          error('Invalid operand "' + opr + '"');
        }
        if (!opr_array[2]) {
          opr_array[2] = 0;
        }

        // register Literal
        if (opr_array[1].match(/=.+/)) {
          var ss = opr_array[1];
          ss = ss.replace(/\\/g, '\\\\');
          ss = ss.replace(/\+/g, '\\\+');
          ss = ss.replace(/\*/g, '\\\*');
          ss = ss.replace(/\?/g, '\\\?');
          ss = ss.replace(/\./g, '\\\.');
          ss = ss.replace(/\(/g, '\\\(');
          ss = ss.replace(/\)/g, '\\\)');
          ss = ss.replace(/\[/g, '\\\[');
          ss = ss.replace(/\]/g, '\\\]');
          ss = ss.replace(/\{/g, '\\\{');
          ss = ss.replace(/\}/g, '\\\}');
          ss = ss.replace(/\|/g, '\\\|');

          var isLiteral = 0;
          for (var j = 0; j < literal_stack.length; j++) {
            if (literal_stack[j] == ss) {
              isLiteral = 1;
              break;
            }
          }
          if (!isLiteral) {
            literal_stack.push(opr_array[1]);
          }
          if (DEBUG) {
            console.log('Literal:' + opr_array[1]);
          }
        } else if (
            opr_array[1].match(/^[A-Z][a-zA-Z0-9]*/) &&
            !opr_array[1].match(/^GR[0-7]$/)) {
          opr_array[1] = var_scope + '.' + opr_array[1];
        }
        // instructions with GR, GR.
        if (opr_array[1].match(/^GR[0-7]$/)) {
          var instcode = CASL2TBL[inst]['code'] + 4;
          gen_code3(memoryp, address, instcode, opr_array[0], opr_array[1]);
          address++;
        } else {
          gen_code2(
              memoryp, address, CASL2TBL[inst]['code'], opr_array[0],
              opr_array[1], opr_array[2]);
          address += 2;
        }
        // START instruction
      } else if (type == 'start') {
        if (!label) {
          error('No label found at START');
        }

        if (first_start == 1) {
          first_start = 0;
          memoryp['-1'] = (opr_array.length) ? label + '.' + opr_array[0] : 0;
        } else {
          actual_label = (opr_array.length) ? opr_array[0] : 0;
          virtual_label = label;
          if (DEBUG) {
            console.log(
                'Actual: ' + actual_label + ', Virtual:' + virtual_label);
          }
        }
        var_scope = label;
        if (DEBUG) {
          console.log('SCOPE: ' + var_scope);
        }
        add_label(symtblp, label, address);
        in_block = 1;
        // END instruction
      } else if (type == 'end') {
        if (label) {
          error('Can\'t use label "' + label + '" at END');
        }
        if (opr_array.length) {
          error('Invalid operand "' + opr + '"');
        }

        // expand_literal;
        literal_stack.forEach(lit => {
          add_literal(symtblp, lit, address);
          lit = lit.replace(/=/, '');
          var result;
          if (result = lit.match(/^\'(.+)\'$/)) {
            var str = result[1];
            str = str.replace(/\'\'/g, '\'');
            var vals = unpack_C(str);
            for (var j = 0; j < vals.length; j++) {
              gen_code1(memoryp, address, vals[j]);
              address++;
            }
          } else if (lit.match(
                         /^[+-]?\d+$|^\#[\da-fA-F]+$/)) {  // decial or hex
            gen_code1(memoryp, address, lit);
            address++;
          } else {
            error('Invalid literal: =' + lit);
          }
        });

        var_scope = '';
        in_block = 0;

        // DS instruction
      } else if (type == 'ds') {
        if (opr_array.length != 1) {
          error('Invalid operand "' + opr + '"');
        }
        check_decimal(opr_array[0]);
        for (var j = 1; j <= opr_array[0]; j++) {
          gen_code1(memoryp, address, 0);
          address++;
        }

        // DC instruction
      } else if (type == 'dc') {
        if (opr_array.length >= 1) {  // number or label
          for (var j = 0; j < opr_array.length; j++) {
            if (result = opr_array[j].match(/^'(.+)'$/)) {
              var str = result[1];
              str = str.replace(/''/g, '\'');
              var vals = unpack_C(str);
              for (var k = 0; k < vals.length; k++) {
                gen_code1(memoryp, address, vals[k]);
                address++;
              }
            } else if (opr_array[j].match(/^[A-Z][a-zA-Z\d]*$/)) {
              opr_array[j] = var_scope + '.' + opr_array[j];
              gen_code1(memoryp, address, opr_array[j]);
              address++;
              //            } else if (result =
              //            opr_array[j].match(/^\#([\da-f][\da-f][\da-f][\da-f])$/i)) {
              //              gen_code1(memoryp, address, parseInt(result[1],
              //              16)); address++;
            } else {
              gen_code1(memoryp, address, opr_array[j]);
              address++;
            }
          }
        } else {
          error('Invalid operand "' + opr + '"');
        }
        // IN/OUT macro
      } else if ((type == 'in') || (type == 'out')) {
        if (opr_array.length != 2) {
          error('Invalid operand "' + opr + '"');
        }

        // two operands must be labels, not numbers
        check_label(opr_array[0]);
        check_label(opr_array[1]);

        opr_array[0] = var_scope + '.' + opr_array[0];
        opr_array[1] = var_scope + '.' + opr_array[1];

        // IN/OUT macro is expanded to push two operands onto the
        // stack, call SYS_IN / SYS_OUT, and restore stack.
        entry = (type == 'in') ? SYS_IN : SYS_OUT;
        gen_code2(memoryp, address, CASL2TBL['PUSH']['code'], 0, 0, 1);
        gen_code2(memoryp, address + 2, CASL2TBL['PUSH']['code'], 0, 0, 2);
        gen_code2(
            memoryp, address + 4, CASL2TBL['LAD']['code'], 1, opr_array[0], 0);
        gen_code2(
            memoryp, address + 6, CASL2TBL['LAD']['code'], 2, opr_array[1], 0);
        gen_code2(memoryp, address + 8, CASL2TBL['SVC']['code'], 0, entry, 0);
        gen_code3(memoryp, address + 10, CASL2TBL['POP']['code'], 2, 0);
        gen_code3(memoryp, address + 11, CASL2TBL['POP']['code'], 1, 0);
        address += 12;

        // RPUSH macro
      } else if (type == 'rpush') {
        if (opr_array.length) {
          error('Invalid operand "' + opr + '"');
        }
        for (var j = 0; j < 7; j++) {
          gen_code2(
              memoryp, address + j * 2, CASL2TBL['PUSH']['code'], 0, 0, j + 1);
        }
        address += 14;

        // RPOP macro
      } else if (type == 'rpop') {
        if (opr_array.length) {
          error('Invalid operand "' + opr + '"');
        }
        for (var j = 0; j < 7; j++) {
          gen_code3(memoryp, address + j, CASL2TBL['POP']['code'], 7 - j, 0);
        }
        address += 7;
      } else {
        error('Instruction type "' + type + '" is not implemented');
      }
    }
  }
  if (in_block) error('NO "END" instruction found');
}

function pass2(file, symtblp, memoryp, bufp) {
  if (opt_a) {
    console.log('CASL LISTING\n');
  }
  var address;
  var last_line = -1;
  var memkeys = Object.keys(memoryp);

  memkeys.sort(function(a, b) {
    return Number(a) - Number(b);
  });

  for (var i = 0; i < memkeys.length; i++) {
    address = Number(memkeys[i]);
    // skip if start address
    if (address < 0) continue;
    __line = memoryp[address]['line'];
    var val = expand_label(symtblp, memoryp[address]['val']);
    //    console.log(__line);
    file.push(val);
    // print OUT pack( 'n', $val );
    if (opt_a) {
      var result;
      var aLine = bufp[__line - 1].split(/\t/);
      if (result = aLine[0].match(/\.([A-Za-z\d]+)$/)) {
        aLine[0] = result[1];
      }
      var bufline = aLine.join('\t');
      if (__line != last_line) {
        var str = '';
        str = spacePadding(__line, 4) + ' ' +
            zeroPadding(address.toString(16), 4) + ' ' +
            zeroPadding(val.toString(16), 4);
        str += '\t' + bufline ; //+ '\n';
        outdump.push(str);

        last_line = __line;
      } else {
        var str = '';
        str = spacePadding(__line, 4) + '      ' +
            zeroPadding(val.toString(16), 4);
        //str += '\n';
        outdump.push(str);
      }
    }
  }
  if (opt_a) {
    for (var i = 0; i < outdump.length; i++) {
      caslprint(outdump[i]);
    }
  }
}


//// comet2

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
  'du|dump'   : { subr : cmd_dump,   list : 0 },
  'st|stack'  : { subr : cmd_stack,  list : 0 },
//  'f|file'    : { subr : cmd_file,   list : 1 },
  'j|jump'    : { subr : cmd_jump,   list : 1 },
  'm|memory'  : { subr : cmd_memory, list : 1 },
  'di|disasm' : { subr : cmd_disasm, list : 0 },
  'h|help'    : { subr : cmd_help,   list : 0 },
};

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

var COMET2MEM_INIT = [	4608,     5, 11264, 11264,
	11264,  4608,     5,  4624,
			2, 11521,  4624,     0,
	11521, 33024
 ];
// memory image
var comet2mem = COMET2MEM_INIT;
// PC, FR, GR0, GR1, GR2, GR3, GR4, GR5, GR6, GR7, SP, break points
var state = [0x0000, FR_ZERO, 0, 0, 0, 0, 0, 0, 0, 0, STACK_TOP, []];

var run_stop = 0;
var last_cmd;

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
      val = parseInt(res[1], 16);
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
      return 0;
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
	return 1;
}

var last_ret ;

function cmd_run(memoryp, statep, arg) {
  if (DEBUG) {
    console.log('cmd_run(' + memoryp + ',' + statep + ',' + arg + ')');
  }
  run_stop = 0;
	last_ret = 1;
//  const intervalId = setInterval(() => {
	while (!run_stop) {
    if (step_exec(memoryp, statep) == 0) {
			run_stop = 1;
			last_ret = 0;
		}
    for (var i = 0; i < statep[BP].length; i++) {
      var pnt = statep[BP][i];
      if (pnt == statep[PC]) {
        cometprint(`Breakpoint ${i}, #${zeroPadding(hex(pnt), 4)}`);
        run_stop = 1;
        break;
      }
    }
//    if (run_stop) {
//      clearInterval(intervalId);
//    }
//  }, 10);
	}
//	console.log(`last_ret:${last_ret}`);
	return last_ret;
}

function cmd_step(memoryp, statep, args) {
  if (DEBUG) {
    console.log(`cmd_step( ${memoryp} / ${statep} / ${args} )`);
  }
	var count = 1;	
	if (args != []) { 
	  count = expand_number(args);
  	if (!count) {
    	count = 1;
  	}
	}
  for (var i = 1; i <= count; i++) {
    if (step_exec(memoryp, statep) == 0) {
			return 0;
		}
  }
	return 1;
}

function cmd_dump(memoryp, statep, args) {
  if (DEBUG) {
    console.log(`cmd_dump( ${memoryp} / ${statep} / ${args} )`);
  }

	var val = expand_number( args[0] );
	if (val != null) {
	  val = statep[PC];
	}

	var row, col, base;
	for (row = 0; row < 16; row++) {
			var line = '';
			base = val + ( row << 3 );
			line = zeroPadding(hex(base),4) + ':';
			for (col = 0; col < 8; col ++) {
					line += ' ' + zeroPadding(hex(mem_get( memoryp, base + col )),4) ;
			}
			line += ' ';
			for (col = 0; col < 8; col ++) {
				var c = mem_get( memoryp, base + col ) & 0xff;
				line += ( ( c >= 0x20 && c <= 0x7f ) ? String.fromCharCode(c) : ".");
			}
			cometprint(line);
	}
	return 1;
}

function cmd_stack( memoryp, statep, args ) {
  if (DEBUG) {
    console.log(`cmd_stack( ${memoryp} / ${statep} / ${args} )`);
  }

	var val = statep[SP];
	cmd_dump( memoryp, statep, val );
	return 1;
}


function cmd_jump( memoryp, statep, args ) {
  if (DEBUG) {
    console.log(`cmd_jump( ${memoryp} / ${statep} / ${args} )`);
  }

	var val = expand_number( args[0] );
	if ( val != null) {
			statep[PC] = val;
	}
	else {
			cometprint("Invalid argument.\n");
	}
	return 1;
}


function cmd_memory( memoryp, statep, args ) {
  if (DEBUG) {
    console.log(`cmd_memory( ${memoryp} / ${statep} / ${args} )`);
  }

	var adr = expand_number( args[0] );
	var val = expand_number( args[1] );
	if ( adr != null && val != null ) {
			mem_put( memoryp, adr, val );
	} else {
			cometprint("Invalid argument.\n");
	}
	return 1;
}


function cmd_disasm ( memoryp, statep, args ) {
  if (DEBUG) {
    console.log(`cmd_disasm( ${memoryp} / ${statep} / ${args} )`);
  }

	var val = null;
	if (args != []) {
		val = expand_number( args[0] );
	}
	if (val == null) {
		val = statep[PC];
	}

	var pc = statep[PC];    // save original PC
	statep[PC] = val;

	for ( var i = 0 ; i < 16 ; i++ ) {
			var result  = parse( memoryp, statep );
			cometprint(`#${zeroPadding(hex(statep[PC]),4)}\t${result[0]}\t${result[1]}\n`);
			statep[PC] += result[2];
	}
	statep[PC] = pc;       // restore PC
	return 1;
}


function cmd_info() {
	
	return 1;
}
function cmd_print(memoryp, statep, args) {
  if (DEBUG) {
    console.log(`cmd_print( ${memoryp} / ${statep} / ${args} )`);
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
 
  cometprint("\n");
  cometprint(`PR  #${hex(pc,4)} [ ${inst} ${opr} ]`);
  var fr_str = ((fr >> 2) % 2).toString() + ((fr > 2) % 2).toString()  + (fr % 2).toString();  
  cometprint(`SP  #${hex(sp,4)}(${ spacePadding(signed(sp),6) })    FR  ${fr_str}  (${fr})`);
  cometprint(`GR0 #${hex(regs[0],4)}(${ spacePadding(signed(regs[0]),6) })  GR1 #${hex(regs[1],4)}(${ spacePadding(signed(regs[1]),6) })  GR2 #${hex(regs[2],4)}(${ spacePadding(signed(regs[2]),6) })  GR3 #${hex(regs[3],4)}(${ spacePadding(signed(regs[3]),6) })`);
  cometprint(`GR4 #${hex(regs[4],4)}(${ spacePadding(signed(regs[4]),6) })  GR5 #${hex(regs[5],4)}(${ spacePadding(signed(regs[5]),6) })  GR6 #${hex(regs[6],4)}(${ spacePadding(signed(regs[6]),6) })  GR7 #${hex(regs[7],4)}(${ spacePadding(signed(regs[7]),6) })`);
	return 1;
}

function cmd_help ( memoryp, statep, args ) {
  if (DEBUG) {
    console.log(`cmd_help( ${memoryp} / ${statep} / ${args} )`);
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
//  cometprint("f,  file	Use FILE as program to be debugged.");
  cometprint("j,  jump	Continue program at specifed address.");
  cometprint("m,  memory	Change the memory at ADDRESS to VALUE.");
  cometprint("di, disasm      Disassemble 32 words from specified address.");
  cometprint("h,  help	Print list of commands.");
  cometprint("q,  quit	Exit comet.");
	return 1;
}


////// terminal

/* harmony import */ var terminal_js_emulator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(917);
/* harmony import */ var terminal_js_emulator__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(terminal_js_emulator__WEBPACK_IMPORTED_MODULE_0__);
let t1 = new (terminal_js_emulator__WEBPACK_IMPORTED_MODULE_0___default())('terminal-1');
t1  
.setHeight("720px")
.setWidth("640px")
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
								var result = CMDTBL[key].subr(comet2mem,state,cmds);
								//t1.print(`command - ${key}`);
								if (CMDTBL[key].list) {
									cmd_print(comet2mem,state,cmds);
								}
								found = 1;
								break;
							}
						}
						if (!found) {
							t1.print(`Undefined command "${cmd}". Try "help".`);
							terminal1();
						}
						if (result) {
							terminal1();
						}
					});
//        document.getElementById('version').innerHTML = t1.getVersion();
}

function comet2init() {
	comet2mem = comet2ops;
	// PC, FR, GR0, GR1, GR2, GR3, GR4, GR5, GR6, GR7, SP, break points
	state = [0x0000, FR_ZERO, 0, 0, 0, 0, 0, 0, 0, 0, STACK_TOP, []];
	t1.clear();
	t1.print(`This is COMET II, version ${VERSION}.\n(c) 2001-2022, Osamu Mizuno.\n\n`);
	cmd_print(comet2mem,state,[]);
	terminal1();	
}

var t2 = new (terminal_js_emulator__WEBPACK_IMPORTED_MODULE_0___default())('terminal-2');
let terminal2 = function() {
	t2
			.clear()
			.setHeight("240px")
			.setWidth('600px')
			.setBackgroundColor('#205191')
			.print('CASL2 log');
}

function cometprint(msg) {
	t1.print(msg);	
}

function caslprint(msg) {
	t2.print(msg);
}

comet2init();
//terminal1();
terminal2();
// refresh buttons
document.getElementById("terminal-refresh").addEventListener("click", comet2init);
document.getElementById("assemble").addEventListener("click", assemble);
//function() {
//	comet2mem = COMET2MEM_INIT;
//	// PC, FR, GR0, GR1, GR2, GR3, GR4, GR5, GR6, GR7, SP, break points
//	state = [0x0000, FR_ZERO, 0, 0, 0, 0, 0, 0, 0, 0, STACK_TOP, []];
//	t1.clear();
//	t1.print(`This is COMET II, version ${VERSION}.\n(c) 2001-2022, Osamu Mizuno.\n\n`);
//	cmd_print(comet2mem,state,[]);
//	terminal1();
//});

})();

/******/ })()
;