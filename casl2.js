var VERSION = '0.9.9 KIT (Feb 28, 2023)';
var DEBUG = 0;
var DDEBUG = 0;

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

// addresses of IN/OUT system calls --- these MACROs are expanded
// to call this address after pushing its arguments on stack.
var SYS_IN = 0xfff0;
var SYS_OUT = 0xfff2;
var EXIT_USR = 0x0000;
var EXIT_OVF = 0x0001;
var EXIT_DVZ = 0x0002;
var EXIT_ROV = 0x0003;

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

var opt_a = 0;

const fs = require('fs');
var program = require('commander');

let c2bin = Buffer.alloc(65535);

const main = () => {
  program
  .version(VERSION)
  .usage('[options] <casl2 file>')
  .option('-a, --all', 'show detailed info')
  .parse(process.argv);
  var options = program.opts();
  if (options.all) {
    opt_a = 1;
  }
  try {
    const inputFilepath = program.args[0]; // process.argv[2];
    if (!inputFilepath) {
      throw('No casl2 source file specified.');
    }
    const basename = inputFilepath.split('/').pop().split('.').shift();
    const outputFilepath = basename + ".com";
    const casl2code = fs.readFileSync(inputFilepath, 'utf-8');
    //    console.log(casl2code);
    pass1(casl2code, symtbl, memory, buf);
    pass2(symtbl, memory, buf);
    fs.writeFileSync(outputFilepath, c2bin);
    // console.log(`Write to ${outputFilepath}`);
  } catch (e) {
    //エラー処理
    console.log(e);
  }
  //  console.log(memory);
  //  console.log(symtbl);
  //  console.log(comet2ops);
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
  if (!label.match(/^[a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*$/)) {
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
      } else if (result = val.match(/:([a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*)$/)) {
        var k = `${result[1]}:${result[1]}`;
        if (hashref[k]) {
          nval = hashref[k]['val'];
        } else {
          error('Undefined label "' + lbl + '"');
        }
      } else {
        error('Undefined label "' + lbl + '"');
      }
    } else if (!val.match(/^[+-]?\d+$/)) {
      var sym = val;
      if (result = val.match(/([a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*):([a-zA-Z\$%_\.][0-9a-zA-Z\$%_\.]*)$/)) {
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
  var uniq_label = `${var_scope}:${label}`;
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
  var uniq_label = `${var_scope}:${label}`;
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
  var result = sregister.match(/^(GR)?([0-7])$/i);
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
    } else if (result = lines[i].match(/^(\S+)\s*$/)) {
      label = result[1];
      inst = '';
      opr = '';
      if (DEBUG) {
        console.log('label/inst/opr =' + label + '/' + inst + '/' + opr);
      }
  } else {
      error('Syntax error:' + lines[i]);
    }
    // keep every line in @buf for later use
    var uniq_label;
    if (label != '') {
      uniq_label = `${var_scope}:${label}`;
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
      if (opr_array[2] && opr_array[2].match(/^(GR)?0$/i)) {
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
          error('Invalid operand "' + opr + '"');
        }
        if (opr_array[1] && opr_array[1].match(/^(GR)?0$/i)) {
          error('Can\'t use GR0 as an index register');
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
          error('No label found at START');
        }

        if (first_start == 1) {
          first_start = 0;
          comet2startLabel = (opr_array.length) ? `${label}:${opr_array[0]}` : `${label}:${label}`;
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

function pass2(symtblp, memoryp, bufp) {
  if (opt_a) {
    console.log('CASL LISTING\n');
  }
  var address;
  var last_line = -1;
  var memkeys = Object.keys(memoryp);

  memkeys.sort(function(a, b) {
    return Number(a) - Number(b);
  });
  comet2startAddress = expand_label(symtblp, comet2startLabel);

  c2bin.writeUInt8(0x43,0);  c2bin.writeUInt8(0x41,1);
  c2bin.writeUInt8(0x53,2);  c2bin.writeUInt8(0x4c,3);
  c2bin.writeUInt8(comet2startAddress >>> 8 & 0xff,4);
  c2bin.writeUInt8(comet2startAddress & 0xff,5);
  for (var i = 0; i < 10; i++ ) {
    c2bin.writeUInt8(0, 6+i);
  }
  var c2addr = 16;
  for (var i = 0; i < memkeys.length; i++) {
    address = Number(memkeys[i]);
    // skip if start address
    if (address < 0) continue;
    __line = memoryp[address]['line'];
    var val = expand_label(symtblp, memoryp[address]['val']);
    // print OUT pack( 'n', $val );
    var vh = (val >>> 8) & 0xff;
    var vl = val & 0xff;
    c2bin.writeUInt8(vh, c2addr++);
    c2bin.writeUInt8(vl, c2addr++);
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
  c2bin = c2bin.subarray(0,c2addr);
  if (opt_a) {
    for (var i = 0; i < outdump.length; i++) {
      console.log(outdump[i]);
    }
  }
}

main();
