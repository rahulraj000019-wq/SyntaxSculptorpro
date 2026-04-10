import { Instruction } from './ir';

export class Optimizer {
  optimize(instructions: Instruction[]): Instruction[] {
    let current = instructions;
    let changed = true;

    while (changed) {
      const result = this.constantFolding(current);
      changed = result.changed;
      current = result.instructions;
    }

    return current;
  }

  private constantFolding(instructions: Instruction[]): { instructions: Instruction[], changed: boolean } {
    const optimized: Instruction[] = [];
    const constants: Map<string, number> = new Map();
    let changed = false;

    for (const inst of instructions) {
      if (inst.op === '=') {
        const val = parseFloat(inst.arg1);
        if (!isNaN(val)) {
          constants.set(inst.result, val);
          optimized.push(inst);
        } else if (constants.has(inst.arg1)) {
          const foldedVal = constants.get(inst.arg1)!;
          constants.set(inst.result, foldedVal);
          optimized.push({ ...inst, arg1: foldedVal.toString() });
          changed = true;
        } else {
          constants.delete(inst.result);
          optimized.push(inst);
        }
      } else if (['+', '-', '*', '/'].includes(inst.op)) {
        const arg1Val = parseFloat(inst.arg1);
        const arg2Val = inst.arg2 ? parseFloat(inst.arg2) : NaN;

        const v1 = !isNaN(arg1Val) ? arg1Val : constants.get(inst.arg1);
        const v2 = inst.arg2 ? (!isNaN(arg2Val) ? arg2Val : constants.get(inst.arg2)) : undefined;

        if (v1 !== undefined && v2 !== undefined) {
          let result: number;
          switch (inst.op) {
            case '+': result = v1 + v2; break;
            case '-': result = v1 - v2; break;
            case '*': result = v1 * v2; break;
            case '/': result = v1 / v2; break;
            default: result = 0;
          }
          constants.set(inst.result, result);
          optimized.push({ op: '=', arg1: result.toString(), result: inst.result });
          changed = true;
        } else {
          constants.delete(inst.result);
          optimized.push(inst);
        }
      } else {
        optimized.push(inst);
      }
    }

    return { instructions: optimized, changed };
  }
}
