/*
   _________   _____ __       ________      __   __________  __  _______________   ________
  / ____/   | / ___// /      /  _/  _/    _/_/  / ____/ __ \/  |/  / ____/_  __/  /  _/  _/
 / /   / /| | \__ \/ /       / / / /    _/_/   / /   / / / / /|_/ / __/   / /     / / / /  
/ /___/ ___ |___/ / /___   _/ /_/ /   _/_/    / /___/ /_/ / /  / / /___  / /    _/ /_/ /   
\____/_/  |_/____/_____/  /___/___/  /_/      \____/\____/_/  /_/_____/ /_/    /___/___/   
    c2c2.js                                            
    for use of command line 
*/
var VERSION = '0.9.9 KIT (Feb 28, 2023)';
var DEBUG = 0;
var DDEBUG = 0;

// common functions

// addresses of IN/OUT system calls --- these MACROs are expanded
// to call this address after pushing its arguments on stack.
const SYS_IN = 0xfff0;
const SYS_OUT = 0xfff2;
const EXIT_USR = 0x0000;
const EXIT_OVF = 0x0001;
const EXIT_DVZ = 0x0002;
const EXIT_ROV = 0x0003;

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

function hex(val, len) {
  return zeroPadding(val.toString(16), len);
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

/*
   _________   _____ __       ________
  / ____/   | / ___// /      /  _/  _/
 / /   / /| | \__ \/ /       / / / /  
/ /___/ ___ |___/ / /___   _/ /_/ /   
\____/_/  |_/____/_____/  /___/___/   
                                      */

var CASL2TBL = {
  'NOP': { code: 0x00, type: 'op4' },
  'LD': { code: 0x10, type: 'op5' },
  'ST': { code: 0x11, type: 'op1' },
  'LAD': { code: 0x12, type: 'op1' },
  'ADDA': { code: 0x20, type: 'op5' },
  'SUBA': { code: 0x21, type: 'op5' },
  'ADDL': { code: 0x22, type: 'op5' },
  'SUBL': { code: 0x23, type: 'op5' },
  'MULA': { code: 0x28, type: 'op5' },
  'DIVA': { code: 0x29, type: 'op5' },
  'MULL': { code: 0x2A, type: 'op5' },
  'DIVL': { code: 0x2B, type: 'op5' },
  'AND': { code: 0x30, type: 'op5' },
  'OR': { code: 0x31, type: 'op5' },
  'XOR': { code: 0x32, type: 'op5' },
  'CPA': { code: 0x40, type: 'op5' },
  'CPL': { code: 0x41, type: 'op5' },
  'SLA': { code: 0x50, type: 'op1' },
  'SRA': { code: 0x51, type: 'op1' },
  'SLL': { code: 0x52, type: 'op1' },
  'SRL': { code: 0x53, type: 'op1' },
  'JMI': { code: 0x61, type: 'op2' },
  'JNZ': { code: 0x62, type: 'op2' },
  'JZE': { code: 0x63, type: 'op2' },
  'JUMP': { code: 0x64, type: 'op2' },
  'JPL': { code: 0x65, type: 'op2' },
  'JOV': { code: 0x66, type: 'op2' },
  'PUSH': { code: 0x70, type: 'op2' },
  'POP': { code: 0x71, type: 'op3' },
  'CALL': { code: 0x80, type: 'op2' },
  'RET': { code: 0x81, type: 'op4' },
  'SVC': { code: 0xf0, type: 'op2' },
  // psude instruction
  'START': { type: 'start' },
  'END': { type: 'end' },
  'DS': { type: 'ds' },
  'DC': { type: 'dc' },
  // CASL II macros
  'IN': { type: 'in' },
  'OUT': { type: 'out' },
  'RPUSH': { type: 'rpush' },
  'RPOP': { type: 'rpop' },
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
var comet2startAddress = 0;
var comet2startLabel;
var comet2bin = [];

var opt_a = false;
var opt_nc = false;

const fs = require('fs');
var program = require('commander');

function assemble() {
  try {
    const inputFilepath = program.args.shift();
    if (!inputFilepath) {
      throw ('[CASL2 ERROR] No casl2 source file is specified.');
    }
    actual_label = '';
    virtual_label = '';
    first_start = 1;
    var_scope = '';
    comet2bin = [];
    outdump = [];
    buf = [];
    memory = {};
    symtbl = {};
    comet2startAddress = 0;
    const casl2code = fs.readFileSync(inputFilepath, 'utf-8');
    pass1(casl2code, symtbl, memory, buf);
    pass2(comet2bin, symtbl, memory, buf);
    caslprint(`Successfully assembled.`);
    comet2mem = comet2bin.slice(0,comet2bin.length);
    comet2init(`Loading comet2 binary ... done`);
    return 1;
  } catch (e) {
    //エラー処理
    caslprint(e);
    return 0;
  }
}

function caslprint(msg) {
  if (!opt_q) console.log(msg);
}

function error_casl2(msg) {
  throw (str_red_yellow(`Line ${__line}: ${msg}`));
}

function check_label(label) {
    if (!label.match(/^[a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*$/)) {
    error_casl2(`Invalid label "${label}"`);
  }
}

// Expand the string VAL to corresponding decimal number --- symbol is
// resolved and hexadecimal number is converted to decimal.
function expand_label(hashref, val) {
  if (DEBUG) {
    console.log(`expand_label(${val})`);
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
      } else if (result = val.match(/:([a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*)$/)) {
        var k = `${result[1]}:${result[1]}`;
        if (hashref[k]) {
          nval = hashref[k]['val'];
        } else {
          error_casl2(`Undefined label "${lbl}"`);
        }
      } else {
        error_casl2(`Undefined label "${lbl}"`);
      }
    } else if (!val.match(/^[+-]?\d+$/)) {
      var sym = val;
      if (result = val.match(/([a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*):([a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*)$/)) {
        if (result[1] == result[2]) {
          sym = result[2];
        } else {
          sym = `${result[2]} in routine ${result[1]}`;
        }
      }
      error_casl2(`Undefined symbol "${sym}"`);
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
  var uniq_label = `${var_scope}:${label}`;
  if (hashref[uniq_label]) {
    error_casl2(`Label "${label}" has already defined`);
  }
  hashref[uniq_label] = { 'val': val, 'file': __file, 'line': __line };

  if (DEBUG) {
    console.log(`add_label(${uniq_label}:${val})`);
  }
}

// Update a label LABEL in the symbol table HASHREF into the value
// VAL.  If LABEL has not defined yet, display error and exit.
function update_label(hashref, label, val) {
  check_label(label);
  var uniq_label = `${var_scope}:${label}`;
  if (!hashref[uniq_label]) {
    error_casl2(`Label "${label}" is not defined`);
  }
  hashref[uniq_label] = { 'val': val, 'file': __file, 'line': __line };

  if (DEBUG) {
    console.log(`update_label(${uniq_label}:${val})`);
  }
}

// Register a literal in the symbol table HASHREF with the value
// VAL.
function add_literal(hashref, literal, val) {
  // check_literal($literal);
  hashref[literal] = { 'val': val, 'file': __file, 'line': __line };
  if (DEBUG) {
    console.log(`add_literal(${val})`);
  }
}

// Check the validity of decimal number NUMBER. If not valid, display
// error and exit.
function check_decimal(number) {
  if (DEBUG) {
    console.log(`check_decimal(${number})`);
  }
  if (isNaN(Number(number))) {
    error_casl2(`"${number}" must be decimal`);
  }
}

// Check the validity of register REGISTER.  Return the register number
// (0 - 7). If not valid, display error and exit.  Otherwise,
function check_register(register) {
  var sregister = String(register);
  if (DEBUG) {
    console.log(`check_register(${sregister})`);
  }
  var result = sregister.match(/^(GR)?([0-7])$/i);
  if (!result) {
    error_casl2(`Invalid register "${sregister}"`);
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
  hashref[String(address)] = { 'val': val, 'file': __file, 'line': __line };
}

// Generate two-byte codes from CODE, GR, ADR, and XR at ADDRESS in
// HASHREF.
function gen_code2(hashref, address, code, gr, adr, xr) {
  var ngr = check_register(gr);
  var nxr = check_register(xr);
  var val = (code << 8) + (ngr << 4) + nxr;
  hashref[String(address)] = { 'val': val, 'file': __file, 'line': __line };
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
  hashref[String(address)] = { 'val': adr, 'file': __file, 'line': __line };
}

function gen_code3(hashref, address, code, gr1, gr2) {
  var ngr1 = check_register(gr1);
  var ngr2 = check_register(gr2);

  var val = (code << 8) + (ngr1 << 4) + ngr2;
  hashref[String(address)] = { 'val': val, 'file': __file, 'line': __line };
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
      console.log(`${__line}:${lines[i]}`);
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
        console.log(`label/inst/opr = ${label}/${inst}/${opr}`);
      }
    } else if (result = lines[i].match(/^(\S+)\s*$/)) {
      label = result[1];
      inst = '';
      opr = '';
      if (DEBUG) {
        console.log(`label/inst/opr = ${label}/${inst}/${opr}`);
      }
    } else {
      error_casl2(`Syntax error: ${lines[i]}`);
    }
    // keep every line in @buf for later use
    var uniq_label;
    if (label != '') {
      uniq_label = `${var_scope}:${label}`;
    } else {
      uniq_label = '';
    }
    bufp[i] = `${uniq_label}\t${inst}\t${opr}`;

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
        error_casl2(`Illegal instruction "${inst}"`);
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
            mode == 'str' && opr.substring(opid, opid + 1) == '\'') {
            if (opr.substring(opid, opid + 2) == '\'\'') {
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
            console.log(`${opr_array[k]}:`);
          }
        }
      }

      // accurately, this definition is wrong in CASL II
      // DC 'hogehoge, hugahuga.'
      // DC 'h' ',ogehoge, hugahuga.'
      // LD GR1, = ','

      // START must be the first instruction
      if (!in_block && (type != 'start')) {
        error_casl2('NO "START" instruction found');
      }

      // GR0 cannot be used as an index register.
      if (opr_array[2] && opr_array[2].match(/^(GR)?0$/i)) {
        error_casl2('Can\'t use GR0 as an index register');
      }

      // instructions with GR, adr, and optional XR
      if (type == 'op1') {
        if (!(opr_array.length >= 2 && opr_array.length <= 3)) {
          error_casl2(`Invalid operand "${opr}"`);
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
            console.log(`Literal:${opr_array[1]}`);
          }
        } else if (
          opr_array[1].match(/^[a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*/) &&
          !opr_array[1].match(/^GR[0-7]$/i)) {
          opr_array[1] = `${var_scope}:${opr_array[1]}`;
        }
        gen_code2(
          memoryp, address, CASL2TBL[inst]['code'], opr_array[0], opr_array[1],
          opr_array[2]);
        address += 2;
        // instructions with adr, and optional XR
      } else if (type == 'op2') {
        if (!(1 <= opr_array.length && opr_array.length <= 2)) {
          error_casl2(`Invalid operand "${opr}"`);
        }
        if (opr_array[1] && opr_array[1].match(/^(GR)?0$/i)) {
          error_casl2('Can\'t use GR0 as an index register');
        }

        if (!opr_array[1]) {
          opr_array[1] = 0;
        }

        if (!opr_array[0].match(/^GR[0-7]$/i) &&
          opr_array[0].match(/^[a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*/)) {
          if (inst.match(/CALL/i)) {
            opr_array[0] = `CALL_${var_scope}:${opr_array[0]}`;
          } else {
            opr_array[0] = `${var_scope}:${opr_array[0]}`;
          }
        }
        gen_code2(
          memoryp, address, CASL2TBL[inst]['code'], 0, opr_array[0],
          opr_array[1]);
        address += 2;
        // instructions only with optional GR
      } else if (type == 'op3') {
        if (opr_array.length != 1) {
          error_casl2(`Invalid operand "${opr}"`);
        }
        gen_code3(memoryp, address, CASL2TBL[inst]['code'], opr_array[0], 0);
        address++;
        // instructions without operand
      } else if (type == 'op4') {
        if (opr_array.length) {
          error_casl2(`Invalid operand "${opr}"`);
        }
        gen_code1(memoryp, address, (CASL2TBL[inst]['code'] << 8));
        address++;

        // instructions with (GR, adr, and optional XR), or (GR, GR)
      } else if (type == 'op5') {
        if (!(opr_array.length >= 2 && opr_array.length <= 3)) {
          error_casl2(`Invalid operand "${opr}"`);
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
            console.log(`Literal:${opr_array[1]}`);
          }
        } else if (
          opr_array[1].match(/^[a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*/) &&
          !opr_array[1].match(/^GR[0-7]$/i)) {
          opr_array[1] = `${var_scope}:${opr_array[1]}`;
        }
        // instructions with GR, GR.
        if (opr_array[1].match(/^GR[0-7]$/i)) {
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
          error_casl2('No label found at START');
        }

        if (first_start == 1) {
          first_start = 0;
          comet2startLabel = (opr_array.length) ? `${label}:${opr_array[0]}` : `${label}:${label}`;
        } else {
          actual_label = (opr_array.length) ? opr_array[0] : 0;
          virtual_label = label;
          if (DEBUG) {
            console.log(`Actual: ${actual_label}, Virtual:${virtual_label}`);
          }
        }
        var_scope = label;
        if (DEBUG) {
          console.log(`SCOPE: ${var_scope}`);
        }
        add_label(symtblp, label, address);
        in_block = 1;
        // END instruction
      } else if (type == 'end') {
        if (label) {
          error_casl2(`Can't use label "${label}" at END`);
        }
        if (opr_array.length) {
          error_casl2(`Invalid operand "${opr}"`);
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
            error_casl2(`Invalid literal =${lit}`);
          }
        });

        var_scope = '';
        in_block = 0;

        // DS instruction
      } else if (type == 'ds') {
        if (opr_array.length != 1) {
          error_casl2(`Invalid operand "${opr}"`);
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
              gen_code1(memoryp, address, 0); // '\0'
              address++;
            } else if (opr_array[j].match(/^[a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*$/)) {
              opr_array[j] = `${var_scope}:${opr_array[j]}`;
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
          error_casl2(`Invalid operand "${opr}"`);
        }
        // IN/OUT macro
      } else if ((type == 'in') || (type == 'out')) {
        if (opr_array.length != 2) {
          error_casl2(`Invalid operand "${opr}"`);
        }

        // two operands must be labels, not numbers
        check_label(opr_array[0]);
        check_label(opr_array[1]);

        opr_array[0] = `${var_scope}:${opr_array[0]}`;
        opr_array[1] = `${var_scope}:${opr_array[1]}`;

        // IN/OUT macro is expanded to push two operands onto the
        // stack, call SYS_IN / SYS_OUT, and restore stack.
        var entry = (type == 'in') ? SYS_IN : SYS_OUT;
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
          error_casl2(`Invalid operand "${opr}"`);
        }
        for (var j = 0; j < 7; j++) {
          gen_code2(
            memoryp, address + j * 2, CASL2TBL['PUSH']['code'], 0, 0, j + 1);
        }
        address += 14;

        // RPOP macro
      } else if (type == 'rpop') {
        if (opr_array.length) {
          error_casl2(`Invalid operand "${opr}"`);
        }
        for (var j = 0; j < 7; j++) {
          gen_code3(memoryp, address + j, CASL2TBL['POP']['code'], 7 - j, 0);
        }
        address += 7;
      } else {
        error_casl2(`Instruction type "${type}" is not implemented`);
      }
    }
  }
  if (in_block) error_casl2('NO "END" instruction found');
}

function pass2(file, symtblp, memoryp, bufp) {
  if (opt_a) {
    caslprint('CASL LISTING\n');
  }
  var address;
  var last_line = -1;
  var memkeys = Object.keys(memoryp);

  memkeys.sort(function (a, b) {
    return Number(a) - Number(b);
  });

  comet2startAddress = expand_label(symtblp, comet2startLabel);

  for (var i = 0; i < memkeys.length; i++) {
    address = Number(memkeys[i]);
    // skip if start address
    if (address < 0) continue;
    __line = memoryp[address]['line'];
    var val = expand_label(symtblp, memoryp[address]['val']);
    file.push(val);
    // print OUT pack( 'n', $val );
    if (opt_a) {
      var result;
      var aLine = bufp[__line - 1].split(/\t/);
      if (result = aLine[0].match(/:([a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*)$/)) {
        aLine[0] = result[1];
      }
      var bufline = aLine.join('\t');
      if (__line != last_line) {
        var str = `${spacePadding(__line, 4)} ${hex(address, 4)} ${hex(val, 4)}\t${bufline}`;
        outdump.push(str);

        last_line = __line;
      } else {
        var str = `${spacePadding(__line, 4)}      ${hex(val, 4)}`;
        //str += '\n';
        outdump.push(str);
      }
    }
  }
  
  if (opt_a) {
    outdump.push("\nDEFINED SYMBOLS");
    var where = [];
    for (const key in symtblp) {
      //outdump.push(key);
      //outdump.push(symtblp[key]['line']);
      where[symtblp[key]['line']] = key;
      //outdump.push(where[symtblp[key]['line']]);
    }
    where.sort(function (a, b) {
      return Number(a) - Number(b);
    });
    for (const key2 in where) {
      //outdump.push(where[key2]);
      var label = where[key2];
      if (!label.match(/^=/)) {
        const marray = label.match(/^([a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*):([a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*)$/);
        var label_view;
        if (marray[1] == marray[2]) {
          label_view = marray[2];
        } else {
          label_view = `${marray[2]} (${marray[1]})`;
        }
        outdump.push(`${symtblp[label]['line']}:\t${hex(expand_label(symtblp, label), 4)}\t${label_view}`);
      }
    }
  }
  if (opt_a) {
    for (var i = 0; i < outdump.length; i++) {
      caslprint(outdump[i]);
    }
  }
}

/*
   __________  __  _______________   ________
  / ____/ __ \/  |/  / ____/_  __/  /  _/  _/
 / /   / / / / /|_/ / __/   / /     / / / /  
/ /___/ /_/ / /  / / /___  / /    _/ /_/ /   
\____/\____/_/  /_/_____/ /_/    /___/___/   
*/

var COMET2TBL = {
  // COMET instructions
  '0x00': { id: 'NOP', type: 'op4' },
  '0x10': { id: 'LD', type: 'op1' },
  '0x11': { id: 'ST', type: 'op1' },
  '0x12': { id: 'LAD', type: 'op1' },
  '0x14': { id: 'LD', type: 'op5' },
  '0x20': { id: 'ADDA', type: 'op1' },
  '0x21': { id: 'SUBA', type: 'op1' },
  '0x22': { id: 'ADDL', type: 'op1' },
  '0x23': { id: 'SUBL', type: 'op1' },
  '0x24': { id: 'ADDA', type: 'op5' },
  '0x25': { id: 'SUBA', type: 'op5' },
  '0x26': { id: 'ADDL', type: 'op5' },
  '0x27': { id: 'SUBL', type: 'op5' },
  '0x28': { id: 'MULA', type: 'op1' },
  '0x29': { id: 'DIVA', type: 'op1' },
  '0x2a': { id: 'MULL', type: 'op1' },
  '0x2b': { id: 'DIVL', type: 'op1' },
  '0x2c': { id: 'MULA', type: 'op5' },
  '0x2d': { id: 'DIVA', type: 'op5' },
  '0x2e': { id: 'MULL', type: 'op5' },
  '0x2f': { id: 'DIVL', type: 'op5' },
  '0x30': { id: 'AND', type: 'op1' },
  '0x31': { id: 'OR', type: 'op1' },
  '0x32': { id: 'XOR', type: 'op1' },
  '0x34': { id: 'AND', type: 'op5' },
  '0x35': { id: 'OR', type: 'op5' },
  '0x36': { id: 'XOR', type: 'op5' },
  '0x40': { id: 'CPA', type: 'op1' },
  '0x41': { id: 'CPL', type: 'op1' },
  '0x44': { id: 'CPA', type: 'op5' },
  '0x45': { id: 'CPL', type: 'op5' },
  '0x50': { id: 'SLA', type: 'op1' },
  '0x51': { id: 'SRA', type: 'op1' },
  '0x52': { id: 'SLL', type: 'op1' },
  '0x53': { id: 'SRL', type: 'op1' },
  '0x61': { id: 'JMI', type: 'op2' },
  '0x62': { id: 'JNZ', type: 'op2' },
  '0x63': { id: 'JZE', type: 'op2' },
  '0x64': { id: 'JUMP', type: 'op2' },
  '0x65': { id: 'JPL', type: 'op2' },
  '0x66': { id: 'JOV', type: 'op2' },
  '0x70': { id: 'PUSH', type: 'op2' },
  '0x71': { id: 'POP', type: 'op3' },
  '0x80': { id: 'CALL', type: 'op2' },
  '0x81': { id: 'RET', type: 'op4' },
  '0xf0': { id: 'SVC', type: 'op2' },
};

var CMDTBL = {
  'r|run': { subr: cmd_run, list: 0 },
  's|step': { subr: cmd_step, list: 1 },
  'b|break': { subr: cmd_break, list: 0 },
  'd|delete': { subr: cmd_delete, list: 0 },
  'i|info': { subr: cmd_info, list: 0 },
  'p|print': { subr: cmd_print, list: 0 },
  'du|dump': { subr: cmd_dump, list: 0 },
  'st|stack': { subr: cmd_stack, list: 0 },
  'f|file': { subr: cmd_file, list: 1 },
  'j|jump': { subr: cmd_jump, list: 1 },
  'm|memory': { subr: cmd_memory, list: 1 },
  'di|disasm': { subr: cmd_disasm, list: 0 },
  'h|help': { subr: cmd_help, list: 0 },
};

const FR_PLUS = 0;
const FR_ZERO = 1;
const FR_MINUS = 2;
const FR_OVER = 4;

// the top of the stack, which is the upper limit of the stack space.
const STACK_TOP = 0xff00;

// indices for the state list, state
const PC = 0;
const FR = 1;
const GR0 = 2;
const GR1 = 3;
const GR2 = 4;
const GR3 = 5;
const GR4 = 6;
const GR5 = 7;
const GR6 = 8;
const GR7 = 9;
const SP = 10;
const BP = 11;
// maximum/minimum of signed value
const MAX_SIGNED = 32767;
const MIN_SIGNED = -32768;

const INPUT_MODE_CMD = 0;
const INPUT_MODE_IN = 1;

// memory image
var comet2mem = [];
// PC, FR, GR0, GR1, GR2, GR3, GR4, GR5, GR6, GR7, SP, break points
var state = [0x0000, FR_PLUS, 0, 0, 0, 0, 0, 0, 0, 0, STACK_TOP, []];

var input_mode = INPUT_MODE_CMD;
var input_buffer;

var last_cmd;
var next_cmd = "";
var run_stop = 0;

var opt_q = false;
var opt_Q = false;

const readline = require('readline/promises');

function str_color(code, str) {
  return (opt_nc ? str : `${code}${str}\x1b[0m`); 
}

function str_green(str) {
  return str_color('\x1b[32m',str); 
}

function str_i_green(str) {
  return str_color('\x1b[3;32m',str); 
}

function str_white_green(str) {
  return str_color('\x1b[37;48;5;22m',str); 
}

function str_red_yellow(str) {
  return str_color('\x1b[31;43m',str); 
}

function str_red(str) {
  return str_color('\x1b[31m',str); 
}

function str_i_red(str) {
  return str_color('\x1b[3;31m',str); 
}

function str_yellow(str) {
  return str_color('\x1b[38;5;214m',str); 
}

function str_b_cyan(str) {
  return str_color('\x1b[1;36m',str); 
}

function error_comet2(msg) {
  throw (str_red_yellow(msg));
}

function info_comet2(msg) {
  throw (str_white_green(msg));
}

function cometprint(msg) {
  console.log(msg);
}

function cometout(msg) {
  process.stdout.write((!opt_Q ? `${str_i_red('OUT')}> ` : "") + msg + (msg.slice(-1) != '\n' ? '\n' : ''));
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
  var pc = statep[PC];
  var inst = mem_get(memoryp, pc) >> 8;
  var gr = (mem_get(memoryp, pc) >> 4) & 0xf;
  var xr = mem_get(memoryp, pc) & 0xf;
  var adr = mem_get(memoryp, pc + 1);

  var inst_sym = 'DC';
  var opr_sym = `#${hex(mem_get(memoryp, pc), 4)}`;
  var size = 1;
  var key = `0x${hex(inst, 2)}`;

  if (COMET2TBL[key]) {
    inst_sym = COMET2TBL[key]['id'];
    var type = COMET2TBL[key]['type'];
    // instructions with GR, adr, and XR
    if (type == 'op1') {
      opr_sym = `GR${gr},   #${hex(adr, 4)}`;
      if (xr > 0) {
        opr_sym += `, GR${xr}`;
      }
      size = 2;
      // instructions with adr and XR
    } else if (type == 'op2') {  //    # with adr, (XR)
      opr_sym = `#${hex(adr, 4)}`;
      if (xr > 0) {
        opr_sym += `, GR${xr}`;
      }
      size = 2;
      // instructions with GR
    } else if (type == 'op3') {  // only with GR
      opr_sym = `GR${gr}`;
      size = 1;
      // instructions without operand
    } else if (type == 'op4') {  // no operand
      opr_sym = '';
      size = 1;
      // instructions with GR and GR
    } else if (type == 'op5') {  // with GR, GR
      opr_sym = `GR${gr}, GR${xr}`;
      size = 1;
    }
  }
  var results = [inst_sym, opr_sym, size];
  return results;
}

// Handler of the IN system call --- extract two arguments from the
// stack, read a line from STDIN, store it in specified place.
function exec_in(memoryp, statep, text) {
  text.trim();
  if (text.length > 256) {
    text = text.substr(0, 256);  //      # must be shorter than 256 characters
  }
  var regs = statep.slice(GR0, GR7 + 1);
  var lenp = regs[2];
  var bufp = regs[1];
  mem_put(memoryp, lenp, text.length);
  var ainput = unpack_C(text);
  for (var i = 0; i < ainput.length; i++) {
    mem_put(memoryp, bufp++, ainput[i]);
  }
  statep[PC] += 2;
}

// Handler of the OUT system call --- extract two arguments from the
// stack, write a string to STDOUT.
function exec_out(memoryp, statep) {
  var regs = statep.slice(GR0, GR7 + 1);
  var lenp = regs[2];
  var bufp = regs[1];
  var len = mem_get(memoryp, lenp);

  var outstr = '';
  for (var i = 1; i <= len; i++) {
    outstr += String.fromCharCode(mem_get(memoryp, bufp + (i - 1)) & 0xff);
  }
  cometout(outstr);
}

// Execute one instruction from the PC --- evaluate the intruction,
// update registers, and advance the PC by the instruction's size.
function step_exec(memoryp, statep) {
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

  var stop_flag = 0;

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
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
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
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
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
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
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
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
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
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
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
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
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
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
      regs[gr] = signed(regs[gr]);
      var m = mem_get(memoryp, eadr);
      if (m == 0) {
        fr = FR_OVER | FR_ZERO;
        if (!opt_q) {
          cometprint("Waring: Division by zero in DIVA.");
        }
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
        if (!opt_q) {
          cometprint("Waring: Division by zero in DIVA.");
        }
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
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
      var m = mem_get(memoryp, eadr);
      if (m == 0) {
        fr = FR_OVER | FR_ZERO;
        if (!opt_q) {
          cometprint("Waring: Division by zero in DIVL.");
        }
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
        if (!opt_q) {
          cometprint("Waring: Division by zero in DIVL.");
        }
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
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
      regs[gr] &= mem_get(memoryp, eadr);
      fr = get_flag(regs[gr]);
      pc += 2;

    } else {
      regs[gr] &= regs[xr];
      fr = get_flag(regs[gr]);
      pc += 1;
    }

  } else if (inst == 'OR') {
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
      regs[gr] |= mem_get(memoryp, eadr);
      fr = get_flag(regs[gr]);
      pc += 2;

    } else {
      regs[gr] |= regs[xr];
      fr = get_flag(regs[gr]);
      pc += 1;
    }

  } else if (inst == 'XOR') {
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
      regs[gr] ^= mem_get(memoryp, eadr);
      fr = get_flag(regs[gr]);
      pc += 2;

    } else {
      regs[gr] ^= regs[xr];
      fr = get_flag(regs[gr]);
      pc += 1;
    }

  } else if (inst == 'CPA') {
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
      val = signed(regs[gr]) - signed(mem_get(memoryp, eadr));
      if (val > MAX_SIGNED) {
        val = MAX_SIGNED;
      }
      if (val < MIN_SIGNED) {
        val = MIN_SIGNED;
      }
      fr = get_flag(unsigned(val));
      pc += 2;

    } else {
      val = signed(regs[gr]) - signed(regs[xr]);
      if (val > MAX_SIGNED) {
        val = MAX_SIGNED;
      }
      if (val < MIN_SIGNED) {
        val = MIN_SIGNED;
      }
      fr = get_flag(unsigned(val));
      pc += 1;
    }

  } else if (inst == 'CPL') {
    if (!opr.match(/GR[0-7], GR[0-7]/i)) {
      val = regs[gr] - mem_get(memoryp, eadr);
      if (val > MAX_SIGNED) {
        val = MAX_SIGNED;
      }
      if (val < MIN_SIGNED) {
        val = MIN_SIGNED;
      }
      fr = get_flag(unsigned(val));
      pc += 2;
    } else {
      val = regs[gr] - regs[xr];
      if (val > MAX_SIGNED) {
        val = MAX_SIGNED;
      }
      if (val < MIN_SIGNED) {
        val = MIN_SIGNED;
      }
      fr = get_flag(unsigned(val));
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
      info_comet2('Program finished (RET)');
    }

  } else if (inst == 'SVC') {
    if (eadr == SYS_IN) {
      input_mode = INPUT_MODE_IN;
      stop_flag = 1;
    } else if (eadr == SYS_OUT) {
      exec_out(memoryp, statep);
      pc += 2;
    } else if (eadr == EXIT_USR) {
      info_comet2(`Program finished (SVC ${EXIT_USR})`);
    } else if (eadr == EXIT_OVF) {
      info_comet2(`Program finished (SVC ${EXIT_OVF})`);
    } else if (eadr == EXIT_DVZ) {
      info_comet2(`Program finished (SVC ${EXIT_DVZ})`);
    } else if (eadr == EXIT_ROV) {
      info_comet2(`Program finished (SVC ${EXIT_ROV})`);
    }

  } else if (inst == 'NOP') {
    pc++;

  } else {
    error_comet2(`Illegal instruction ${inst} at #${hex(pc, 4)}`);
  }

  // update registers
  statep[PC] = pc;
  statep[FR] = fr;
  statep[SP] = sp;
  for (var i = GR0; i <= GR7; i++) {
    statep[i] = regs[i - GR0];
  }
  return stop_flag;
}

function cmd_step(memoryp, statep, args) {
  var count = expand_number(args[0]);
  if (!count) {
    count = 1;
  }
//  try {
    for (var i = 1; i <= count; i++) {
      if (step_exec(memoryp, statep)) {
        // exec_inに依る中断
        if (count - i > 0) {
          next_cmd = `step ${count - i}`;
        }
        break;
      }
    }
//  } catch (e) {
//    cometprint(e);
//  }
}

function cmd_run(memoryp, statep, args) {
  run_stop = 0;
//  try {
    while (!run_stop) {
      if (step_exec(memoryp, statep)) {
        // exec_inに依る中断
        // 次に実行するコマンドとして "run" を保存
        next_cmd = `run`;
        break;
      }
      for (var i = 0; i < statep[BP].length; i++) {
        var pnt = statep[BP][i];
        if (pnt == statep[PC]) {
          run_stop = 1;
          info_comet2(`Breakpoint ${i}, #${hex(pnt, 4)}`);
          break;
        }
      }
    }
//  } catch(e) {
//    cometprint(e);
//  }
}

function cmd_break(memoryp, statep, args) {
  var val = expand_number(args[0]);
  if (val != null) {
    statep[BP].push(val);
  } else {
    cometprint(`Invalid argument: ${args}`);
  }
}

function cmd_delete(memoryp, statep, args) {
  var val = expand_number(args[0]);
  if (val != null) {
    statep[BP].splice(val, 1);
  }
  else {
    statep[BP] = [];
  }
}

function cmd_dump(memoryp, statep, args) {
  var val = expand_number(args[0]);
  if (val == null) {
    val = statep[PC];
  }

  var row, col, base;
  for (row = 0; row < 16; row++) {
    var line = '';
    base = val + (row << 3);
    line = hex(base, 4) + ':';
    for (col = 0; col < 8; col++) {
      line += ' ' + hex(mem_get(memoryp, base + col), 4);
    }
    line += ' ';
    for (col = 0; col < 8; col++) {
      var c = mem_get(memoryp, base + col) & 0xff;
      line += ((c >= 0x20 && c <= 0x7f) ? String.fromCharCode(c) : ".");
    }
    cometprint(line);
  }
}

function cmd_stack(memoryp, statep, args) {
  var val = statep[SP];
  cmd_dump(memoryp, statep, val);
}

function cmd_jump(memoryp, statep, args) {
  var val = expand_number(args[0]);
  if (val != null) {
    statep[PC] = val;
  }
  else {
    cometprint(`Invalid argument: ADDRESS:${args[0]}`);
  }
}


function cmd_memory(memoryp, statep, args) {
  var adr = expand_number(args[0]);
  var val = expand_number(args[1]);
  if (adr != null && val != null) {
    mem_put(memoryp, adr, val);
  } else {
    cometprint(`Invalid argument: ADDRESS:${args[0]} and/or VALUE:${args[1]}`);
  }
}

function cmd_disasm(memoryp, statep, args) {
  var val = expand_number(args[0]);
  if (val == null) {
    val = statep[PC];
  }
  var pc = statep[PC];    // save original PC
  statep[PC] = val;

  for (var i = 0; i < 16; i++) {
    var result = parse(memoryp, statep);
    cometprint(`#${hex(statep[PC], 4)}\t${result[0]}\t${result[1]}`);
    statep[PC] += result[2];
  }
  statep[PC] = pc;       // restore PC
}

function cmd_info(memoryp, statep, args) {
  for (var i = 0; i < statep[BP].length; i++) {
    cometprint(`${spacePadding(i, 2)}: #${hex(statep[BP][i], 4)}`);
  }
}

function cmd_file(memoryp, statep, args) {
  const inputFilepath = args[0];
  if (!inputFilepath) {
    cometprint('File name is required.');
    return 1;
  }
  let buf = Buffer.alloc(65535);
  buf = fs.readFileSync(inputFilepath);
  if (!(buf.readUInt8(0) == 0x43 && buf.readUInt8(1) == 0x41 && buf.readUInt8(2) == 0x53 && buf.readUInt8(3) == 0x4c)) {
    cometprint('The file is not a comet2 binary file.');
    return 1;
  }
  comet2startAddress = buf.readUint8(5) | (buf.readUint8(4) << 8);
  state[0] = comet2startAddress;
  var addr = 0;
  comet2mem = [];
  for (var i = 16; i < buf.length; i += 2) {
    comet2mem[addr] = (buf.readUint8(i + 1) | (buf.readUint8(i) << 8));
    addr++;
  }
  return 1;
}

function cmd_print(memoryp, statep, args) {
  var pc = statep[PC];
  var fr = statep[FR];
  var sp = statep[SP];
  var regs = statep.slice(GR0, GR7 + 1);

  // obtain instruction and operand at current PC
  var res = parse(memoryp, statep);
  var inst = res[0];
  var opr = res[1];

  cometprint("");
  cometprint(`${str_b_cyan('PR')}  ${str_red('#'+hex(pc, 4))} [ ${str_green(`${inst}\t\t${opr}`)} ]`);
  var fr_bin = ((fr >> 2) % 2).toString() + ((fr > 2) % 2).toString() + (fr % 2).toString();
  var fr_str = (((fr >> 2) % 2) ? 'O' : '-') + (((fr > 2) % 2) ? 'S' : '-') + ((fr % 2) ? 'Z' : '-');
  cometprint(`${str_b_cyan('SP')}  ${str_red('#'+hex(sp, 4))}(${spacePadding(signed(sp), 6)})  ${str_b_cyan('FR')}    ${str_yellow(fr_bin)}(${spacePadding(fr, 6)})[ ${str_green(fr_str)} ]`);
  cometprint(`${str_b_cyan('GR0')} ${str_red('#'+hex(regs[0], 4))}(${spacePadding(signed(regs[0]), 6)})  ${str_b_cyan('GR1')} ${str_red('#'+hex(regs[1], 4))}(${spacePadding(signed(regs[1]), 6)})  ${str_b_cyan('GR2')} ${str_red('#'+hex(regs[2], 4))}(${spacePadding(signed(regs[2]), 6)})  ${str_b_cyan('GR3')} ${str_red('#'+hex(regs[3], 4))}(${spacePadding(signed(regs[3]), 6)})`);
  cometprint(`${str_b_cyan('GR4')} ${str_red('#'+hex(regs[4], 4))}(${spacePadding(signed(regs[4]), 6)})  ${str_b_cyan('GR5')} ${str_red('#'+hex(regs[5], 4))}(${spacePadding(signed(regs[5]), 6)})  ${str_b_cyan('GR6')} ${str_red('#'+hex(regs[6], 4))}(${spacePadding(signed(regs[6]), 6)})  ${str_b_cyan('GR7')} ${str_red('#'+hex(regs[7], 4))}(${spacePadding(signed(regs[7]), 6)})`);
}

function cmd_help(memoryp, statep, args) {
  cometprint("List of commands:");
  cometprint("r,  run             \t\tStart execution of program.");
  cometprint("s,  step  [N]       \t\tStep execution. Argument N means do this N times.");
  cometprint("b,  break ADDRESS   \t\tSet a breakpoint at specified ADDRESS.");
  cometprint("d,  delete N...     \t\tDelete some breakpoints.");
  cometprint("i,  info            \t\tPrint information on breakpoints.");
  cometprint("p,  print           \t\tPrint status of PC/FR/SP/GR0..GR7 registers.");
  cometprint("du, dump [ADDRESS]  \t\tDump 128 words of memory image from specified ADDRESS.");
  cometprint("st, stack           \t\tDump 128 words of stack image.");
  cometprint("f,  file	          \t\tUse FILE as program to be debugged.");
  cometprint("j,  jump ADDRESS    \t\tContinue program at specifed ADDRESS.");
  cometprint("m,  memory ADDRESS VALUE\tChange the memory at ADDRESS to VALUE.");
  cometprint("di, disasm [ADDRESS]\t\tDisassemble 32 words from specified ADDRESS.");
  cometprint("re, reload          \t\tReload object code and restart comet2 emulator."); 
  cometprint("h,  help            \t\tPrint list of commands.");
  cometprint("q,  quit            \t\tExit comet2.");
}

function comet2init(msg) {
  comet2mem = comet2bin.slice(0, comet2bin.length);
  // PC, FR, GR0, GR1, GR2, GR3, GR4, GR5, GR6, GR7, SP, break points
  state = [comet2startAddress, FR_PLUS, 0, 0, 0, 0, 0, 0, 0, 0, STACK_TOP, []];
  if (!opt_q) {
    try {
      if (msg.type) {
      } else {
        if (msg != "") {
          cometprint(`${msg}`);
        }
      }
    } catch (e) {
      if (msg != "") {
        cometprint(`${msg}`);
      }
    }
  }
}

/* MAIN 
 *
 *
 *
 */

program
  .version(VERSION)
  .usage('[options] <casl2file> [input1 ...]')
  .option('-a, --all', '[casl2] show detailed info')
  .option('-r, --run', '[comet2] run immediately')
  .option('-n, --nocolor', '[casl2/comet2] disable color messages')
  .option('-q, --quiet', '[casl2/comet2] be quiet')
  .option('-Q, --QuietRun', '[comet2] be QUIET! (implies -q and -r)')
  .parse(process.argv);

var options = program.opts();
if (options.all) {
  opt_a = true;
}
if (options.nocolor) {
  opt_nc = true;
}
if (options.quiet) {
  opt_q = true;
}
if (options.run) {
  next_cmd = "r";
}
if (options.QuietRun) {
  opt_q = true;
  opt_Q = true;
  next_cmd = "r";
}

(async () => {
  try {
    if (!opt_q) {
      cometprint(str_green(`   _________   _____ __       ________
  / ____/   | / ___// /      /  _/  _/
 / /   / /| | \\__ \\/ /       / / / /  
/ /___/ ___ |___/ / /___   _/ /_/ /   
\\____/_/  |_/____/_____/  /___/___/   `));
      cometprint(`This is CASL II, version ${VERSION}.\n(c) 2001-2023, Osamu Mizuno.\n`);
    }
  /*
    const inputFilepath = program.args[0];
    if (!inputFilepath) {
      throw ('No comet2 binary file specified.');
    }

    let buf = Buffer.alloc(65535);
    buf = fs.readFileSync(inputFilepath);
    if (!(buf.readUInt8(0) == 0x43 && buf.readUInt8(1) == 0x41 && buf.readUInt8(2) == 0x53 && buf.readUInt8(3) == 0x4c)) {
      throw ('The file is not a comet2 binary file.');
    }
    comet2startAddress = buf.readUint8(5) | (buf.readUint8(4) << 8);
*/
    if (assemble()) {
      state[PC] = comet2startAddress;
    } else {
      throw ('');
    }
/*
    var addr = 0;
    for (var i = 16; i < buf.length; i += 2) {
      comet2mem[addr] = (buf.readUint8(i + 1) | (buf.readUint8(i) << 8));
      addr++;
    }
*/
  } catch (e) {
    //エラー処理
    console.log(e);
    process.exit(0);
  }
  if (!opt_q) {
    cometprint(str_green(`   __________  __  _______________   ________
  / ____/ __ \\/  |/  / ____/_  __/  /  _/  _/
 / /   / / / / /|_/ / __/   / /     / / / /  
/ /___/ /_/ / /  / / /___  / /    _/ /_/ /   
\\____/\\____/_/  /_/_____/ /_/    /___/___/  `));
    cometprint(`This is COMET II, version ${VERSION}.\n(c) 2001-2023, Osamu Mizuno.\n`);
    cmd_print(comet2mem, state, []);
  }
  var cmd;
  var finish = 0;

  const readInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  input_buffer = program.args.slice(0,program.args.length);
  while (1) {
    var found = 0;
    if (input_mode == INPUT_MODE_CMD) {
      if (next_cmd != "") {
        cmd = next_cmd;
        next_cmd = "";
      } else {
        cmd = await readInterface.question(`${str_yellow('comet2')}> `);
      }
      if (cmd == '') {
        cmd = last_cmd;
      } else {
        last_cmd = cmd;
      }
      var cmds = cmd.replace(/\s+/, ' ').split(' ');
      var cmd2 = cmds.shift();
      if (cmd2.match('^(quit|q)$')) {
        cometprint('[Comet2 finished]');
        break;
      }
      for (const key in CMDTBL) {
        if (cmd2.match('^(' + key + ')$')) {
          found = 1;
          try {
            CMDTBL[key].subr(comet2mem, state, cmds);
          } catch (e) {
            if (!opt_q) {
              cometprint(e);
            }
            finish = 1;
            break;
          }
          if (CMDTBL[key].list) {
            if (!opt_q) {
              if (input_mode == INPUT_MODE_CMD) {
                cmd_print(comet2mem, state, cmds);
              }
            }
          }
          break;
        }
      }
      if (!found) {
        cometprint(`Undefined command "${cmd2}". Try "help".`);
        continue;
      }
      if (finish) {
        break;
      }
    } else if (input_mode == INPUT_MODE_IN) {
      var ppt = opt_Q ? "" : `${str_i_green('IN')}> `;
      if (input_buffer.length == 0) {
        cmd = await readInterface.question(ppt);
      } else {
        cmd = input_buffer.shift();
        cometprint(`${ppt}${cmd}`);
      }
      exec_in(comet2mem, state, cmd);
      input_mode = INPUT_MODE_CMD;
      if (!opt_q) {
        if (last_cmd == "s" || last_cmd == "step") 
          cmd_print(comet2mem, state, []);
      }
    } else {
      cometprint(`Unknown input mode.`);
      break;
    }
  }
  //console.log( string );
  readInterface.close();
})();