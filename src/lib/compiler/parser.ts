import { Lexer, Token, TokenType } from './lexer';
import { SemanticAnalyzer } from './semantic';
import { 
  ASTNode, 
  DeclarationNode, 
  AssignmentNode, 
  BinaryExpressionNode, 
  LiteralNode, 
  IdentifierNode,
  ForLoopNode,
  FunctionCallNode,
  ArrayAccessNode,
  ReturnNode,
  StringLiteralNode,
  UnaryExpressionNode,
  IfNode
} from './ast';

export class Parser {
  private lexer: Lexer;
  private semantic: SemanticAnalyzer;
  private currentToken: Token;
  private errors: { message: string; line: number; type: string }[] = [];

  constructor(lexer: Lexer, semantic: SemanticAnalyzer) {
    this.lexer = lexer;
    this.semantic = semantic;
    this.currentToken = this.lexer.nextToken();
  }

  private consume() {
    this.currentToken = this.lexer.nextToken();
  }

  private match(type: TokenType) {
    if (this.currentToken.type === type) {
      this.consume();
      return true;
    } else {
      this.errors.push({
        message: `Syntax Error: Expected ${type}, found ${this.currentToken.type} ('${this.currentToken.value}')`,
        line: this.currentToken.line,
        type: 'Syntax'
      });
      // Less aggressive error recovery: don't skip the next token if it might be the start of a new statement
      if (this.currentToken.type !== 'SEMICOLON' && this.currentToken.type !== 'EOF' && this.currentToken.type !== 'RBRACE') {
        // Only skip if it's not a keyword that starts a statement
        if (!['INT', 'FLOAT', 'CHAR', 'CONST', 'IF', 'FOR', 'WHILE', 'RETURN', 'ID'].includes(this.currentToken.type)) {
          this.consume();
        }
      }
      if (this.currentToken.type === 'SEMICOLON') this.consume();
      return false;
    }
  }

  parse(): ASTNode[] {
    const nodes: ASTNode[] = [];
    while (this.currentToken.type !== 'EOF') {
      if (this.currentToken.type === 'HASH') {
        // Skip preprocessor directives
        while ((this.currentToken.type as TokenType) !== 'EOF') {
          const currentLine = this.currentToken.line;
          this.consume();
          if (this.currentToken.line !== currentLine) break;
        }
        continue;
      }

      if (['INT', 'FLOAT', 'CHAR', 'CONST'].includes(this.currentToken.type)) {
        const decls = this.declarationOrFunction();
        if (decls) nodes.push(...decls);
      } else if (this.currentToken.type === 'ID') {
        // Check if it's a function definition: main() { ... }
        const next = this.lexer.peekToken();
        if (next.type === 'LPAREN') {
          const decls = this.declarationOrFunction(true); // true means implicit int
          if (decls) nodes.push(...decls);
        } else {
          const stmt = this.parseSingleStatement();
          if (stmt) nodes.push(...stmt);
        }
      } else if (this.currentToken.type === 'LBRACE') {
        const blockNodes = this.parseBlock();
        if (blockNodes) nodes.push(...blockNodes);
      } else {
        this.consume();
      }
    }
    return nodes;
  }

  private parseBlock(): ASTNode[] {
    this.consume(); // Consume {
    const nodes: ASTNode[] = [];
    while (this.currentToken.type !== 'RBRACE' && this.currentToken.type !== 'EOF') {
      const subNodes = this.parseStatement();
      if (subNodes) nodes.push(...subNodes);
    }
    this.match('RBRACE');
    return nodes;
  }

  private parseStatement(): ASTNode[] | null {
    if (this.currentToken.type === 'HASH') {
      const currentLine = this.currentToken.line;
      while ((this.currentToken.type as TokenType) !== 'EOF' && this.currentToken.line === currentLine) {
        this.consume();
      }
      return null;
    }

    if (['INT', 'FLOAT', 'CHAR', 'CONST'].includes(this.currentToken.type)) {
      return this.declarationOrFunction();
    } else if (this.currentToken.type === 'FOR') {
      return [this.parseForLoop()];
    } else if (this.currentToken.type === 'WHILE') {
      return [this.parseWhile()];
    } else if (this.currentToken.type === 'IF') {
      return [this.parseIf()];
    } else if (this.currentToken.type === 'RETURN') {
      return [this.parseReturn()];
    } else if (this.currentToken.type === 'ID') {
      return this.parseSingleStatement();
    } else if (this.currentToken.type === 'PLUS' || this.currentToken.type === 'MINUS') {
      return this.parseSingleStatement(); // Handle prefix ++/--
    } else if (this.currentToken.type === 'LBRACE') {
      return this.parseBlock();
    }
    this.consume();
    return null;
  }

  private parseSingleStatement(): ASTNode[] | null {
    const line = this.currentToken.line;
    
    if (this.currentToken.type === 'PLUS' || this.currentToken.type === 'MINUS') {
      const op = this.currentToken.value;
      this.consume();
      if ((this.currentToken.type as TokenType) === 'ID') {
        const name = this.currentToken.value;
        this.semantic.check(name, line);
        this.consume();
        this.match('SEMICOLON');
        // Treat as assignment: x = x + 1
        return [{ 
          type: 'Assignment', 
          name, 
          expression: { 
            type: 'BinaryExpression', 
            left: { type: 'Identifier', name, line } as IdentifierNode, 
            operator: op === '++' ? '+' : '-', 
            right: { type: 'Literal', value: 1, line } as LiteralNode, 
            line 
          } as BinaryExpressionNode, 
          line 
        } as AssignmentNode];
      }
    }

    if (this.currentToken.type === 'ID') {
      const name = this.currentToken.value;
      this.consume();
      if ((this.currentToken.type as TokenType) === 'LPAREN') {
        const args: ASTNode[] = [];
        this.consume(); // (
        if ((this.currentToken.type as TokenType) !== 'RPAREN') {
          args.push(this.expression());
          while ((this.currentToken.type as TokenType) === 'COMMA') {
            this.consume();
            args.push(this.expression());
          }
        }
        this.match('RPAREN');
        this.match('SEMICOLON');
        return [{ type: 'FunctionCall', name, args, line } as FunctionCallNode];
      } else if ((this.currentToken.type as TokenType) === 'LBRACKET') {
        this.semantic.check(name, line);
        this.consume();
        const index = this.expression();
        this.match('RBRACKET');
        this.match('ASSIGN');
        const expr = this.expression();
        this.match('SEMICOLON');
        return [{ type: 'Assignment', name, expression: expr, isArrayAccess: true, arrayIndex: index, line } as AssignmentNode];
      } else if ((this.currentToken.type as TokenType) === 'ASSIGN') {
        this.semantic.check(name, line);
        this.consume();
        const expr = this.expression();
        this.match('SEMICOLON');
        return [{ type: 'Assignment', name, expression: expr, line } as AssignmentNode];
      } else if (((this.currentToken.type as TokenType) === 'PLUS' && this.currentToken.value === '++') || 
                 ((this.currentToken.type as TokenType) === 'MINUS' && this.currentToken.value === '--')) {
        const op = this.currentToken.value;
        this.semantic.check(name, line);
        this.consume();
        this.match('SEMICOLON');
        const increment = { 
          type: 'Assignment', 
          name, 
          expression: { 
            type: 'BinaryExpression', 
            left: { type: 'Identifier', name, line } as IdentifierNode, 
            operator: op === '++' ? '+' : '-', 
            right: { type: 'Literal', value: 1, line } as LiteralNode, 
            line 
          } as BinaryExpressionNode, 
          line 
        } as AssignmentNode;
        return [increment];
      }
    }
    return null;
  }

  private parseWhile(): ASTNode {
    const line = this.currentToken.line;
    this.consume(); // while
    this.match('LPAREN');
    const condition = this.expression();
    this.match('RPAREN');
    const body = this.currentToken.type === 'LBRACE' ? this.parseBlock() : (this.parseStatement() || []);
    // Return as ForLoop for simplicity in this AST
    return { type: 'ForLoop', init: null, condition, increment: null, body, line } as ForLoopNode;
  }

  private parseIf(): IfNode {
    const line = this.currentToken.line;
    this.consume(); // if
    this.match('LPAREN');
    const condition = this.expression();
    this.match('RPAREN');
    
    const thenBody = this.currentToken.type === 'LBRACE' ? this.parseBlock() : (this.parseStatement() || []);
    let elseBody: ASTNode[] = [];
    
    if (this.currentToken.type === 'ELSE') {
      this.consume();
      elseBody = (this.currentToken.type as TokenType) === 'LBRACE' ? this.parseBlock() : (this.parseStatement() || []);
    }
    
    return { type: 'If', condition, thenBody, elseBody, line };
  }

  private parseForLoop(): ForLoopNode {
    const line = this.currentToken.line;
    this.consume(); // for
    this.match('LPAREN');
    
    let init: ASTNode | null = null;
    if (this.currentToken.type !== 'SEMICOLON') {
      if (['INT', 'FLOAT', 'CHAR', 'CONST'].includes(this.currentToken.type)) {
        const decls = this.declarationOrFunction();
        if (decls && decls.length > 0) init = decls[0];
      } else {
        // Simple assignment for now
        const name = this.currentToken.value;
        this.semantic.check(name, line);
        this.consume();
        this.match('ASSIGN');
        const expr = this.expression();
        init = { type: 'Assignment', name, expression: expr, line: this.currentToken.line } as AssignmentNode;
      }
    }
    this.match('SEMICOLON');
    
    let condition: ASTNode | null = null;
    if (this.currentToken.type !== 'SEMICOLON') {
      condition = this.expression();
    }
    this.match('SEMICOLON');
    
    let increment: ASTNode | null = null;
    if (this.currentToken.type !== 'RPAREN') {
      // Simple increment for now
      const name = this.currentToken.value;
      this.semantic.check(name, line);
      this.consume();
      if (this.currentToken.value === '++' || this.currentToken.value === '--') {
        const op = this.currentToken.value;
        this.consume();
        increment = { 
          type: 'Assignment', 
          name, 
          expression: { 
            type: 'BinaryExpression', 
            left: { type: 'Identifier', name, line } as IdentifierNode, 
            operator: op === '++' ? '+' : '-', 
            right: { type: 'Literal', value: 1, line } as LiteralNode, 
            line 
          } as BinaryExpressionNode, 
          line 
        } as AssignmentNode;
      } else {
        this.expression(); // skip for now
      }
    }
    this.match('RPAREN');
    
    const body = this.currentToken.type === 'LBRACE' ? this.parseBlock() : (this.parseStatement() || []);
    
    return { type: 'ForLoop', init, condition, increment, body, line };
  }

  private parseReturn(): ReturnNode {
    const line = this.currentToken.line;
    this.consume(); // return
    let value: ASTNode | null = null;
    if (this.currentToken.type !== 'SEMICOLON') {
      value = this.expression();
    }
    this.match('SEMICOLON');
    return { type: 'Return', value, line };
  }

  private declarationOrFunction(implicitInt: boolean = false): ASTNode[] | null {
    const typeLine = this.currentToken.line;
    let varType = 'int';
    
    if (this.currentToken.type === 'CONST') {
      this.consume();
    }
    
    if (!implicitInt) {
      if (!['INT', 'FLOAT', 'CHAR'].includes(this.currentToken.type)) {
        // If it's not a type, maybe it's just an ID (implicit int)
        if (this.currentToken.type === 'ID') {
          implicitInt = true;
        } else {
          return null;
        }
      } else {
        varType = this.currentToken.value;
        this.consume(); // Consume type (INT, FLOAT, CHAR)
      }
    }
    
    if (this.currentToken.type === 'ID') {
      const name = this.currentToken.value;
      this.consume();

      // Check for function: int main(...) { ... }
      if ((this.currentToken.type as TokenType) === 'LPAREN') {
        this.consume();
        while ((this.currentToken.type as TokenType) !== 'RPAREN' && (this.currentToken.type as TokenType) !== 'EOF') {
          this.consume(); // Skip parameters for now
        }
        this.match('RPAREN');
        if ((this.currentToken.type as TokenType) === 'LBRACE') {
          return this.parseBlock();
        }
        return [];
      }

      // It's a declaration (possibly multiple)
      const declarations: ASTNode[] = [];
      let varName = name;
      
      while (true) {
        let isArray = false;
        let arraySize: ASTNode | undefined;
        let sizeValue: number | undefined;

        if ((this.currentToken.type as TokenType) === 'LBRACKET') {
          isArray = true;
          this.consume(); // [
          arraySize = this.expression();
          if (arraySize.type === 'Literal') {
            sizeValue = (arraySize as LiteralNode).value;
          } else {
            sizeValue = 100; // Default for VLA in this simple compiler
          }
          this.match('RBRACKET');
        }

        this.semantic.declare(varName, typeLine, varType, isArray, sizeValue);
        
        let initializer: ASTNode | undefined;
        if ((this.currentToken.type as TokenType) === 'ASSIGN') {
          this.consume();
          initializer = this.expression();
        }
        
        declarations.push({ 
          type: 'Declaration', 
          varType, 
          name: varName, 
          initializer, 
          isArray, 
          arraySize, 
          line: typeLine 
        } as DeclarationNode);

        if ((this.currentToken.type as TokenType) === 'COMMA') {
          this.consume();
          if (this.currentToken.type === 'ID') {
            varName = this.currentToken.value;
            this.consume();
            continue;
          }
        }
        break;
      }

      this.match('SEMICOLON');
      return declarations;
    }
    
    return null;
  }

  private assignment(): AssignmentNode | null {
    const varName = this.currentToken.value;
    const line = this.currentToken.line;
    this.semantic.check(varName, line);
    this.consume(); // Consume ID
    
    if (this.currentToken.type === 'ASSIGN') {
      this.consume();
      const expr = this.expression();
      this.match('SEMICOLON');
      return { type: 'Assignment', name: varName, expression: expr, line };
    } else {
      this.errors.push({
        message: `Syntax Error: Expected '=' after identifier, found ${this.currentToken.type}`,
        line: this.currentToken.line,
        type: 'Syntax'
      });
      this.consume();
      return null;
    }
  }

  private expression(): ASTNode {
    let left = this.comparison();
    return left;
  }

  private comparison(): ASTNode {
    let left = this.term();
    while (['LT', 'GT', 'EQ', 'NE', 'LE', 'GE'].includes(this.currentToken.type)) {
      const operator = this.currentToken.value;
      const line = this.currentToken.line;
      this.consume();
      const right = this.term();
      left = { type: 'BinaryExpression', left, operator, right, line } as BinaryExpressionNode;
    }
    return left;
  }

  private term(): ASTNode {
    let left = this.additive();
    return left;
  }

  private additive(): ASTNode {
    let left = this.multiplicative();
    while (['PLUS', 'MINUS'].includes(this.currentToken.type)) {
      const operator = this.currentToken.value;
      const line = this.currentToken.line;
      this.consume();
      const right = this.multiplicative();
      left = { type: 'BinaryExpression', left, operator, right, line } as BinaryExpressionNode;
    }
    return left;
  }

  private multiplicative(): ASTNode {
    let left = this.factor();
    while (['MUL', 'DIV'].includes(this.currentToken.type)) {
      const operator = this.currentToken.value;
      const line = this.currentToken.line;
      this.consume();
      const right = this.factor();
      left = { type: 'BinaryExpression', left, operator, right, line } as BinaryExpressionNode;
    }
    return left;
  }

  private factor(): ASTNode {
    const line = this.currentToken.line;
    if (this.currentToken.type === 'NUMBER') {
      const node: LiteralNode = { type: 'Literal', value: parseFloat(this.currentToken.value), line: this.currentToken.line };
      this.consume();
      return node;
    } else if (this.currentToken.type === 'STRING') {
      const node: StringLiteralNode = { type: 'StringLiteral', value: this.currentToken.value, line: this.currentToken.line };
      this.consume();
      return node;
    } else if (this.currentToken.type === 'AMPERSAND') {
      this.consume();
      const arg = this.factor();
      return { type: 'UnaryExpression', operator: '&', argument: arg, line } as UnaryExpressionNode;
    } else if (this.currentToken.type === 'ID') {
      const name = this.currentToken.value;
      this.consume();
      
      if ((this.currentToken.type as TokenType) === 'LPAREN') {
        const args: ASTNode[] = [];
        this.consume();
        if ((this.currentToken.type as TokenType) !== 'RPAREN') {
          args.push(this.expression());
          while ((this.currentToken.type as TokenType) === 'COMMA') {
            this.consume();
            args.push(this.expression());
          }
        }
        this.match('RPAREN');
        return { type: 'FunctionCall', name, args, line } as FunctionCallNode;
      } else if ((this.currentToken.type as TokenType) === 'LBRACKET') {
        this.semantic.check(name, line);
        this.consume();
        const index = this.expression();
        this.match('RBRACKET');
        return { type: 'ArrayAccess', name, index, line } as ArrayAccessNode;
      }
      
      this.semantic.check(name, line);
      return { type: 'Identifier', name, line } as IdentifierNode;
    } else if (this.currentToken.type === 'LPAREN') {
      this.consume();
      const node = this.expression();
      this.match('RPAREN');
      return node;
    } else {
      this.errors.push({
        message: `Syntax Error: Expected number, identifier or '(', found ${this.currentToken.type}`,
        line: this.currentToken.line,
        type: 'Syntax'
      });
      this.consume();
      return { type: 'Literal', value: 0, line };
    }
  }

  getErrors() {
    return this.errors;
  }
}

