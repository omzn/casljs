/*
   __________  __  _______________   ________
  / ____/ __ \/  |/  / ____/_  __/  /  _/  _/
 / /   / / / / /|_/ / __/   / /     / / / /  
/ /___/ /_/ / /  / / /___  / /    _/ /_/ /   
\____/\____/_/  /_/_____/ /_/    /___/___/   
*/

var VERSION = '0.9.9 KIT (Feb 28, 2023)';
var DEBUG = 0;

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
  'r|run': { subr: cmd_run, list: 1 },
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
var state = [0x0000, FR_ZERO, 0, 0, 0, 0, 0, 0, 0, 0, STACK_TOP, []];
var comet2startAddress = 0;

var input_mode = INPUT_MODE_CMD;

var run_stop = 0;
var last_cmd;
var next_cmd = "";

var opt_q = false;
var opt_Q = false;
var opt_r = false;

const readline = require('readline/promises');
const fs = require('fs');

const readInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

var program = require('commander');

function error_comet2(msg) {
  throw (`[ERROR]${msg}`);
}

function info_comet2(msg) {
  throw (`[INFO]${msg}`);
}

function cometprint(msg) {
  console.log(msg);
}

function cometout(msg) {
  process.stdout.write((!opt_Q ? "OUT> " : "") + msg + (msg.slice(-1) != '\n' ? '\n' : ''));
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
    console.log(`parse( {memoryp} / ${statep} )`);
  }
  var pc = statep[PC];
  var inst = mem_get(memoryp, pc) >> 8;
  var gr = (mem_get(memoryp, pc) >> 4) & 0xf;
  var xr = mem_get(memoryp, pc) & 0xf;
  var adr = mem_get(memoryp, pc + 1);

  var inst_sym = 'DC';
  var opr_sym = `#${hex(mem_get(memoryp, pc), 4)}`;
  var size = 1;
  var key =`0x${hex(inst, 2)}`;

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
  if (DEBUG) {
    console.log(`exec_in( ${statep} / ${text})`);
  }
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
  if (DEBUG) {
    console.log(`exec_out( {memoryp} / ${statep} )`);
  }
  var regs = statep.slice(GR0, GR7 + 1);
  var lenp = regs[2];
  var bufp = regs[1];
  var len = mem_get(memoryp, lenp);

  var obuf = Buffer.alloc(len);
  for (var i = 1; i <= len; i++) {
    obuf.writeUInt8(mem_get(memoryp, bufp + (i - 1)), i - 1);
  }
  cometout(`${obuf.toString()}`);
}

// Execute one instruction from the PC --- evaluate the intruction,
// update registers, and advance the PC by the instruction's size.
function step_exec(memoryp, statep) {
  if (DEBUG) {
    console.log(`step_exec( {memoryp} / ${statep} )`);
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
          caslprint("Waring: Division by zero in DIVA.");
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
          caslprint("Waring: Division by zero in DIVA.");
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
          caslprint("Waring: Division by zero in DIVL.");
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
          caslprint("Waring: Division by zero in DIVL.");
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
      //exec_in(memoryp, statep);
      if (input_mode == INPUT_MODE_CMD) {
        input_mode = INPUT_MODE_IN;
        stop_flag = 1;
      }
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
  if (val) {
    statep[BP].push(val);
  } else {
    cometprint(`Invalid argument: ${args}`);
  }
}

function cmd_delete(memoryp, statep, args) {
  var val = expand_number(args[0]);
  if (val) {
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
  cometprint(`PR  #${hex(pc, 4)} [ ${inst} ${opr} ]`);
  var fr_str = ((fr >> 2) % 2).toString() + ((fr > 2) % 2).toString() + (fr % 2).toString();
  cometprint(`SP  #${hex(sp, 4)}(${signed(sp)})    FR  ${fr_str}  (${fr})`);
  cometprint(`GR0 #${hex(regs[0], 4)}(${signed(regs[0])})  GR1 #${hex(regs[1], 4)}(${signed(regs[1])})  GR2 #${hex(regs[2], 4)}(${signed(regs[2])})  GR3 #${hex(regs[3], 4)}(${signed(regs[3])})`);
  cometprint(`GR4 #${hex(regs[4], 4)}(${signed(regs[4])})  GR5 #${hex(regs[5], 4)}(${signed(regs[5])})  GR6 #${hex(regs[6], 4)}(${signed(regs[6])})  GR7 #${hex(regs[7], 4)}(${signed(regs[7])})`);
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
  cometprint("f,  file	Use FILE as program to be debugged.");
  cometprint("j,  jump ADDRESS    \t\tContinue program at specifed ADDRESS.");
  cometprint("m,  memory ADDRESS VALUE\tChange the memory at ADDRESS to VALUE.");
  cometprint("di, disasm [ADDRESS]\t\tDisassemble 32 words from specified ADDRESS.");
  cometprint("h,  help            \t\tPrint list of commands.");
  cometprint("q,  quit            \t\tExit comet.");
}

program
  .version(VERSION)
  .usage('[options] <comet2 file>')
  .option('-q, --quiet', 'quiet mode')
  .option('-r, --run', 'run mode')
  .option('-Q, --QuietRun', 'hard quiet mode (implies -q and -r)')
  .parse(process.argv);

var options = program.opts();
if (options.quiet) {
  opt_q = true;
}
if (options.run) {
  opt_r = true;
  next_cmd = "r";
}
if (options.QuietRun) {
  opt_q = true;
  opt_Q = true;
  opt_r = true;
  next_cmd = "r";
}

(async () => {
  try {
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
    state[0] = comet2startAddress;
    var addr = 0;
    for (var i = 16; i < buf.length; i += 2) {
      comet2mem[addr] = (buf.readUint8(i + 1) | (buf.readUint8(i) << 8));
      addr++;
    }
    //    console.log(state);
    //    console.log(comet2mem);
  } catch (e) {
    //エラー処理
    console.log(e);
    process.exit(0);
  }
  if (!opt_q) {
    cometprint(`   __________  __  _______________   ________
  / ____/ __ \\/  |/  / ____/_  __/  /  _/  _/
 / /   / / / / /|_/ / __/   / /     / / / /  
/ /___/ /_/ / /  / / /___  / /    _/ /_/ /   
\\____/\\____/_/  /_/_____/ /_/    /___/___/  `);
    cometprint(`This is COMET II, version ${VERSION}.\n(c) 2001-2023, Osamu Mizuno.\n`);
    cmd_print(comet2mem, state, []);
  }
  var cmd;
  var finish = 0;
  while (1) {
    if (input_mode == INPUT_MODE_CMD) {
      if (next_cmd != "") {
        cmd = next_cmd;
        next_cmd = "";
      } else {
        cmd = await readInterface.question("comet2> ");
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
              cmd_print(comet2mem, state, cmds);
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
      var ppt = opt_Q ? "" : "IN> ";
      cmd = await readInterface.question(ppt);
      exec_in(comet2mem, state, cmd);
      input_mode = INPUT_MODE_CMD;
      if (!opt_q) {
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