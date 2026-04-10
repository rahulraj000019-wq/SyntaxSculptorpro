import { Instruction } from './ir';
import { SymbolInfo } from './semantic';

export class CodeGenerator {
  generate(instructions: Instruction[], symbols: SymbolInfo[] = []): string {
    let assembly = ".data\n";
    
    for (const sym of symbols) {
      if (sym.isArray) {
        assembly += `${sym.name}: .word 0:${sym.size || 10}\n`;
      } else {
        assembly += `${sym.name}: .word 0\n`;
      }
    }

    // Add any temporaries that might be used as variables (though they shouldn't be in symbols)
    const temporaries = new Set<string>();
    for (const inst of instructions) {
      if (inst.result.startsWith('t') && !inst.result.includes('[')) {
        temporaries.add(inst.result);
      }
    }
    // We don't actually need to allocate temporaries in .data if we use registers, 
    // but for this simple compiler we'll treat them as variables if they are not in registers.
    // Actually, let's just use registers $t0-$t9 for temporaries t0-t9.
    // If we have more than 10, we'd need to spill. For now, assume < 10.

    assembly += "\n.text\n.globl main\nmain:\n";

    for (const inst of instructions) {
      switch (inst.op) {
        case '=':
          if (this.isNumber(inst.arg1)) {
            assembly += `  li $t0, ${inst.arg1}\n`;
          } else if (inst.arg1.startsWith('t')) {
            assembly += `  move $t0, $${inst.arg1}\n`;
          } else {
            assembly += `  lw $t0, ${inst.arg1}\n`;
          }
          if (inst.result.startsWith('t')) {
            assembly += `  move $${inst.result}, $t0\n`;
          } else {
            assembly += `  sw $t0, ${inst.result}\n`;
          }
          break;
        case '+':
          assembly += this.genBinary('add', inst);
          break;
        case '-':
          assembly += this.genBinary('sub', inst);
          break;
        case '*':
          assembly += this.genBinary('mul', inst);
          break;
        case '/':
          assembly += this.genBinary('div', inst);
          break;
        case 'LT':
        case '<':
          assembly += this.genBinary('slt', inst);
          break;
        case 'GT':
        case '>':
          assembly += this.genBinary('sgt', inst);
          break;
        case 'call':
          assembly += `  # Call ${inst.arg1}(${inst.arg2})\n`;
          if (inst.arg1 === 'printf') {
            assembly += `  li $v0, 4\n  syscall\n`;
          } else if (inst.arg1 === 'scanf') {
            assembly += `  li $v0, 5\n  syscall\n`;
          } else {
            assembly += `  jal ${inst.arg1}\n`;
          }
          if (inst.result.startsWith('t')) {
            assembly += `  move $${inst.result}, $v0\n`;
          }
          break;
        case 'return':
          if (inst.arg1) {
            if (this.isNumber(inst.arg1)) {
              assembly += `  li $v0, ${inst.arg1}\n`;
            } else if (inst.arg1.startsWith('t')) {
              assembly += `  move $v0, $${inst.arg1}\n`;
            } else {
              assembly += `  lw $v0, ${inst.arg1}\n`;
            }
          }
          assembly += `  jr $ra\n`;
          break;
        case '[]=':
          assembly += `  # Array assignment ${inst.arg1}[${inst.arg2}] = ${inst.result}\n`;
          if (this.isNumber(inst.arg2)) {
            assembly += `  li $t1, ${inst.arg2}\n`;
          } else if (inst.arg2.startsWith('t')) {
            assembly += `  move $t1, $${inst.arg2}\n`;
          } else {
            assembly += `  lw $t1, ${inst.arg2}\n`;
          }
          assembly += `  sll $t1, $t1, 2\n`;
          assembly += `  la $t2, ${inst.arg1}\n`;
          assembly += `  add $t2, $t2, $t1\n`;
          if (this.isNumber(inst.result)) {
            assembly += `  li $t0, ${inst.result}\n`;
          } else if (inst.result.startsWith('t')) {
            assembly += `  move $t0, $${inst.result}\n`;
          } else {
            assembly += `  lw $t0, ${inst.result}\n`;
          }
          assembly += `  sw $t0, 0($t2)\n`;
          break;
        case '[]':
          assembly += `  # Array access ${inst.arg1}[${inst.arg2}]\n`;
          if (this.isNumber(inst.arg2)) {
            assembly += `  li $t1, ${inst.arg2}\n`;
          } else if (inst.arg2.startsWith('t')) {
            assembly += `  move $t1, $${inst.arg2}\n`;
          } else {
            assembly += `  lw $t1, ${inst.arg2}\n`;
          }
          assembly += `  sll $t1, $t1, 2\n`;
          assembly += `  la $t2, ${inst.arg1}\n`;
          assembly += `  add $t2, $t2, $t1\n`;
          assembly += `  lw $t0, 0($t2)\n`;
          if (inst.result.startsWith('t')) {
            assembly += `  move $${inst.result}, $t0\n`;
          } else {
            assembly += `  sw $t0, ${inst.result}\n`;
          }
          break;
        case '&[]':
          assembly += `  # Address of array access ${inst.arg1}[${inst.arg2}]\n`;
          if (this.isNumber(inst.arg2)) {
            assembly += `  li $t1, ${inst.arg2}\n`;
          } else if (inst.arg2.startsWith('t')) {
            assembly += `  move $t1, $${inst.arg2}\n`;
          } else {
            assembly += `  lw $t1, ${inst.arg2}\n`;
          }
          assembly += `  sll $t1, $t1, 2\n`;
          assembly += `  la $t2, ${inst.arg1}\n`;
          assembly += `  add $t2, $t2, $t1\n`;
          if (inst.result.startsWith('t')) {
            assembly += `  move $${inst.result}, $t2\n`;
          } else {
            assembly += `  sw $t2, ${inst.result}\n`;
          }
          break;
        case '&':
          assembly += `  la $t0, ${inst.arg1}\n`;
          if (inst.result.startsWith('t')) {
            assembly += `  move $${inst.result}, $t0\n`;
          }
          break;
      }
    }

    assembly += "  li $v0, 10\n  syscall\n";
    return assembly;
  }

  private isNumber(s: string): boolean {
    return !isNaN(parseFloat(s));
  }

  private genBinary(mipsOp: string, inst: Instruction): string {
    let code = "";
    // Load arg1
    if (this.isNumber(inst.arg1)) {
      code += `  li $t1, ${inst.arg1}\n`;
    } else if (inst.arg1.startsWith('t')) {
      code += `  move $t1, $${inst.arg1}\n`;
    } else {
      code += `  lw $t1, ${inst.arg1}\n`;
    }

    // Load arg2
    if (inst.arg2) {
      if (this.isNumber(inst.arg2)) {
        code += `  li $t2, ${inst.arg2}\n`;
      } else if (inst.arg2.startsWith('t')) {
        code += `  move $t2, $${inst.arg2}\n`;
      } else {
        code += `  lw $t2, ${inst.arg2}\n`;
      }
    }

    code += `  ${mipsOp} $t0, $t1, $t2\n`;

    if (inst.result.startsWith('t')) {
      code += `  move $${inst.result}, $t0\n`;
    } else {
      code += `  sw $t0, ${inst.result}\n`;
    }
    return code;
  }
}
