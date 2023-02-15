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
  'b|break'   : { subr : cmd_break,  list : 0 },
  'd|delete'  : { subr : cmd_delete, list : 0 },
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
var comet2mem = [];
// PC, FR, GR0, GR1, GR2, GR3, GR4, GR5, GR6, GR7, SP, break points
var state = [0x0000, FR_ZERO, 0, 0, 0, 0, 0, 0, 0, 0, STACK_TOP, []];

var run_stop = 0;
var last_cmd;

const main = () => {
  terminal.input(`comet> `, function (cmd) {
    if (cmd == '') {
      cmd = last_cmd;
    } else {
      last_cmd = cmd;
    }
    var cmds = cmd.replace(/\s+/,' ').split(' ');
    cmd = cmds.shift();
    for (const key in CMDTBL) {
      if (cmd.match(key)) {
        cmd.subr(comet2mem,state,cmds);
        if (CMDTBL[key].list) {
          cmd_print(comet2mem,state,cmds);
        }
      }
    }
  });
};

function cometprint(str) {
  console.log(str);
}

//function cometprint(str) {
//  console.log(str);
//}

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
      opr_sym = 'GR' + Srting(gr) + ', #' + zeroPadding(adr.toString(16));
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

// Handler of the IN system call --- extract two arguments from the
// stack, read a line from STDIN, store it in specified place.
function exec_in(memoryp, statep) {
  if (DEBUG) {
    console.log('exec_in(' + memoryp + ',' + statep + ')');
  }
  var regs = statep.slice(GR0, GR7 + 1);
  var lenp = regs[2];
  var bufp = regs[1];

  if (DEBUG) {
    console.log('LENP: ' + lenp + ', BUFP: ' + bufp);
  }

  var input;  // [TODO] must get input from somewhere.
  input.trim();
  if (input.length() > 256) {
    input = input.substr(0, 256);  //      # must be shorter than 256 characters
  }
  mem_put(memoryp, lenp, input.length());
  var ainput = unpack_C(input);
  for (var i = 0; i < ainput.length(); i++) {
    mem_put(memoryp, bufp++, ainput[i]);
  }
}

// Handler of the OUT system call --- extract two arguments from the
// stack, write a string to STDOUT.
function exec_out(memoryp, statep) {
  if (DEBUG) {
    console.log('exec_out(' + memoryp + ',' + statep + ')');
  }
  var regs = statep.slice(GR0, GR7 + 1);
  var lenp = regs[2];
  var bufp = regs[1];
  var len = mem_get(memoryp, lenp);

  //    print 'OUT> ' if !::opt_Q;
  for (var i = 1; i <= len; i++) {
    // [TODO] must put output to somewhere.
    console.log(mem_get(memoryp, bufp + (i - 1)) & 0xff);
  }
}

// Execute one instruction from the PC --- evaluate the intruction,
// update registers, and advance the PC by the instruction's size.
function step_exec(memoryp, statep) {
  if (DEBUG) {
    console.log('exec_exec(' + memoryp + ',' + statep + ')');
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
      exec_in(memoryp, statep);
    } else if (eadr == SYS_OUT) {
      exec_out(memoryp, statep);
    }
    pc += 2;

  } else if (inst == 'NOP') {
    pc++;

  } else {
    throw ('Illegal instruction ' + inst + ' at \#' + zeroPadding(pc, 4));
  }

  // update registers
  statep[PC] = pc;
  statep[FR] = fr;
  statep[SP] = sp;
  for (var i = GR0; i <= GR7; i++) {
    statep[i] = regs[i];
  }
}

function cmd_step(memoryp, statep, arg) {
  if (DEBUG) {
    console.log('cmd_step(' + memoryp + ',' + statep + ',' + arg + ')');
  }

  var count = expand_number(arg);
  if (!count) {
    count = 1;
  }
  for (var i = 1; i <= count; i++) {
    step_exec(memoryp, statep);
  }
}

function cmd_run(memoryp, statep, arg) {
  if (DEBUG) {
    console.log('cmd_run(' + memoryp + ',' + statep + ',' + arg + ')');
  }
  run_stop = 0;
  
  const intervalId = setInterval(() => {
    step_exec(memoryp, statep);
    for (var i = 0; i < statep[BP].length; i++) {
      var pnt = statep[BP][i];
      if (pnt == statep[PC]) {
        console.log(
            'Breakpoint ' + i + ', \#' + zeroPadding(pnt.toString(16), 4));
        run_stop = 1;
        break;
      }
    }
    if (run_stop) {
      clearInterval(intervalId);
    }
  }, 10);
}

function cmd_break(memoryp, statep, arg) {
  if (DEBUG) {
    console.log('cmd_break(' + memoryp + ',' + statep + ',' + arg + ')');
  }

  var val = expand_number(arg);
  if (val) {
    statep[BP].push(val);
  } else {
    console.log('Invalid argument.');
  }
}

function cmd_delete(memoryp, statep, arg) {
  if (DEBUG) {
    console.log('cmd_delete(' + memoryp + ',' + statep + ',' + arg + ')');
  }

  var val = expand_number( arg );
  if ( val ) {
    statep[BP].splice(val, 1);
  }
  else {
    statep[BP] = [];
  }
}

function cmd_dump(memoryp, statep, args) {
  if (DEBUG) {
    console.log(`cmd_dump( / ${statep} / ${args} )`);
  }

	var val = expand_number( args[0] );
	if (val == null) {
	  val = statep[PC];
	}
  
	var row, col, base;
	for (row = 0; row < 16; row++) {
			var line = '';
			base = val + ( row << 3 );
			line = hex(base,4) + ':';
			for (col = 0; col < 8; col ++) {
					line += ' ' + hex(mem_get( memoryp, base + col ),4) ;
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
    console.log(`cmd_stack( {memoryp} / ${statep} / ${args} )`);
  }

	var val = statep[SP];
	cmd_dump( memoryp, statep, val );
	return 1;
}


function cmd_jump( memoryp, statep, args ) {
  if (DEBUG) {
    console.log(`cmd_jump( {memoryp} / ${statep} / ${args} )`);
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
    console.log(`cmd_memory( {memoryp} / ${statep} / ${args} )`);
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
    console.log(`cmd_disasm( {memoryp} / ${statep} / ${args} )`);
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
			cometprint(`#${hex(statep[PC],4)}\t${result[0]}\t${result[1]}\n`);
			statep[PC] += result[2];
	}
	statep[PC] = pc;       // restore PC
	return 1;
}

function cmd_break ( memoryp, statep, args ) {
  if (DEBUG) {
    console.log(`cmd_break( {memoryp} / ${statep} / ${args} )`);
  }

	var val = expand_number( args[0] );
	if ( val != null) {
			statep[BP].push(val);
	}
	else {
			cometprint("Invalid argument.");
	}
	return 1;
}

function cmd_info ( memoryp, statep, args ) {
  if (DEBUG) {
    console.log(`cmd_info( {memoryp} / ${statep} / ${args} )`);
  }

	for ( var i = 0; i < statep[BP].length; i++ ) {
			cometprint(`${spacePadding(i,2)}: #${hex(statep[BP][i],4)}`);
	}
	return 1;
}


function cmd_print(memoryp, statep, arg) {
  if (DEBUG) {
    console.log('cmd_print(' + memoryp + ',' + statep + ',' + arg + ')');
  }

  var pc   = statep[PC];
  var fr   = statep[FR];
  var sp   = statep[SP];
  var regs = statep.slice(GR0,GR7+1);

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
