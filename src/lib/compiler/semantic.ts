export interface SemanticError {
  message: string;
  line: number;
  type: 'Semantic';
}

export interface SymbolInfo {
  name: string;
  type: string;
  isArray: boolean;
  size?: number;
  line: number;
}

export class SemanticAnalyzer {
  private symbolTable: Map<string, SymbolInfo> = new Map();
  private errors: SemanticError[] = [];

  declare(name: string, line: number, type: string = 'int', isArray: boolean = false, size?: number) {
    if (this.symbolTable.has(name)) {
      this.errors.push({ 
        type: 'Semantic', 
        line, 
        message: `Semantic Error: Redeclaration of variable '${name}'` 
      });
    }
    this.symbolTable.set(name, { name, type, isArray, size, line });
  }

  check(name: string, line: number) {
    if (!this.symbolTable.has(name)) {
      this.errors.push({ 
        type: 'Semantic', 
        line, 
        message: `Semantic Error: Variable '${name}' used before declaration` 
      });
    }
  }

  getErrors() {
    return this.errors;
  }

  getSymbols(): SymbolInfo[] {
    return Array.from(this.symbolTable.values());
  }

  clear() {
    this.symbolTable.clear();
    this.errors = [];
  }
}
