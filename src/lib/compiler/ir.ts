import { ASTNode, IfNode } from './ast';

export interface Instruction {
  op: string;
  arg1: string;
  arg2?: string;
  result: string;
}

export class IRGenerator {
  private instructions: Instruction[] = [];
  private tempCount: number = 0;

  private newTemp(): string {
    return `t${this.tempCount++}`;
  }

  generate(nodes: ASTNode[]): Instruction[] {
    this.instructions = [];
    this.tempCount = 0;
    for (const node of nodes) {
      this.visit(node);
    }
    return this.instructions;
  }

  private visit(node: ASTNode): string {
    switch (node.type) {
      case 'Declaration':
        if (node.initializer) {
          const initResult = this.visit(node.initializer);
          this.instructions.push({ op: '=', arg1: initResult, result: node.name });
        }
        return '';
      case 'Assignment':
        const exprResult = this.visit(node.expression);
        if (node.isArrayAccess) {
          const index = this.visit(node.arrayIndex!);
          this.instructions.push({ op: '[]=', arg1: node.name, arg2: index, result: exprResult });
          return exprResult;
        } else {
          this.instructions.push({ op: '=', arg1: exprResult, result: node.name });
          return node.name;
        }
      case 'BinaryExpression':
        const left = this.visit(node.left);
        const right = this.visit(node.right);
        const temp = this.newTemp();
        this.instructions.push({ op: node.operator, arg1: left, arg2: right, result: temp });
        return temp;
      case 'Literal':
        return node.value.toString();
      case 'StringLiteral':
        return `"${node.value}"`;
      case 'Identifier':
        return node.name;
      case 'FunctionCall':
        const args = node.args.map(arg => this.visit(arg));
        const callTemp = this.newTemp();
        this.instructions.push({ op: 'call', arg1: node.name, arg2: args.join(', '), result: callTemp });
        return callTemp;
      case 'If':
        const ifNode = node as IfNode;
        const condResult = this.visit(ifNode.condition);
        // Simplified IR for If
        ifNode.thenBody.forEach(stmt => this.visit(stmt));
        ifNode.elseBody.forEach(stmt => this.visit(stmt));
        return '';
      case 'ForLoop':
        if (node.init) this.visit(node.init);
        // We'll simplify for IR visualization
        node.body.forEach(stmt => this.visit(stmt));
        if (node.increment) this.visit(node.increment);
        return '';
      case 'ArrayAccess':
        const index = this.visit(node.index);
        const accessTemp = this.newTemp();
        this.instructions.push({ op: '[]', arg1: node.name, arg2: index, result: accessTemp });
        return accessTemp;
      case 'Return':
        const retVal = node.value ? this.visit(node.value) : '';
        this.instructions.push({ op: 'return', arg1: retVal, result: '' });
        return '';
      case 'UnaryExpression':
        if (node.operator === '&' && node.argument.type === 'ArrayAccess') {
          const arrayAccess = node.argument as any;
          const index = this.visit(arrayAccess.index);
          const addrTemp = this.newTemp();
          this.instructions.push({ op: '&[]', arg1: arrayAccess.name, arg2: index, result: addrTemp });
          return addrTemp;
        }
        const arg = this.visit(node.argument);
        const unaryTemp = this.newTemp();
        this.instructions.push({ op: node.operator, arg1: arg, result: unaryTemp });
        return unaryTemp;
      default:
        return '';
    }
  }
}
