export type TokenType = 
  | 'INT' | 'FLOAT' | 'CHAR' | 'ID' | 'NUMBER' | 'STRING'
  | 'ASSIGN' | 'PLUS' | 'MINUS' | 'MUL' | 'DIV' | 'EQ' | 'NE' | 'LE' | 'GE'
  | 'LPAREN' | 'RPAREN' | 'LBRACE' | 'RBRACE' | 'LBRACKET' | 'RBRACKET'
  | 'SEMICOLON' | 'COMMA' | 'AMPERSAND' | 'HASH' | 'LT' | 'GT' | 'DOT'
  | 'FOR' | 'WHILE' | 'RETURN' | 'IF' | 'ELSE' | 'CONST'
  | 'EOF' | 'ERROR';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private errors: { message: string; line: number; type: string }[] = [];

  constructor(input: string) {
    this.input = input;
  }

  private isDigit(char: string) {
    return /[0-9]/.test(char);
  }

  private isAlpha(char: string) {
    return /[a-zA-Z_]/.test(char);
  }

  private isWhitespace(char: string) {
    return /\s/.test(char);
  }

  nextToken(): Token {
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      if (this.isWhitespace(char)) {
        if (char === '\n') this.line++;
        this.pos++;
        continue;
      }

      // Handle Comments
      if (char === '/' && this.input[this.pos + 1] === '/') {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.pos++;
        }
        continue;
      }
      if (char === '/' && this.input[this.pos + 1] === '*') {
        this.pos += 2;
        while (this.pos < this.input.length && !(this.input[this.pos] === '*' && this.input[this.pos + 1] === '/')) {
          if (this.input[this.pos] === '\n') this.line++;
          this.pos++;
        }
        this.pos += 2;
        continue;
      }

      if (this.isDigit(char)) {
        let value = '';
        while (this.pos < this.input.length && (this.isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) {
          value += this.input[this.pos];
          this.pos++;
        }
        return { type: 'NUMBER', value, line: this.line };
      }

      if (this.isAlpha(char)) {
        let value = '';
        while (this.pos < this.input.length && (this.isAlpha(this.input[this.pos]) || this.isDigit(this.input[this.pos]))) {
          value += this.input[this.pos];
          this.pos++;
        }

        if (value === 'int') return { type: 'INT', value, line: this.line };
        if (value === 'float') return { type: 'FLOAT', value, line: this.line };
        if (value === 'char') return { type: 'CHAR', value, line: this.line };
        if (value === 'void') return { type: 'INT', value, line: this.line }; // Treat void as int for simplicity
        if (value === 'double') return { type: 'FLOAT', value, line: this.line };
        if (value === 'long') return { type: 'INT', value, line: this.line };
        if (value === 'short') return { type: 'INT', value, line: this.line };
        if (value === 'const') return { type: 'CONST', value, line: this.line };
        if (value === 'bool') return { type: 'INT', value, line: this.line };
        if (value === 'true') return { type: 'NUMBER', value: '1', line: this.line };
        if (value === 'false') return { type: 'NUMBER', value: '0', line: this.line };
        if (value === 'for') return { type: 'FOR', value, line: this.line };
        if (value === 'while') return { type: 'WHILE', value, line: this.line };
        if (value === 'return') return { type: 'RETURN', value, line: this.line };
        if (value === 'if') return { type: 'IF', value, line: this.line };
        if (value === 'else') return { type: 'ELSE', value, line: this.line };
        
        return { type: 'ID', value, line: this.line };
      }

      if (char === '"') {
        let value = '';
        this.pos++; // skip "
        while (this.pos < this.input.length && this.input[this.pos] !== '"') {
          if (this.input[this.pos] === '\\' && this.input[this.pos + 1] === '"') {
            value += '"';
            this.pos += 2;
          } else {
            value += this.input[this.pos];
            this.pos++;
          }
        }
        this.pos++; // skip "
        return { type: 'STRING', value, line: this.line };
      }

      if (char === '=') {
        if (this.input[this.pos + 1] === '=') {
          this.pos += 2;
          return { type: 'EQ', value: '==', line: this.line };
        }
        this.pos++;
        return { type: 'ASSIGN', value: '=', line: this.line };
      }
      if (char === '!') {
        if (this.input[this.pos + 1] === '=') {
          this.pos += 2;
          return { type: 'NE', value: '!=', line: this.line };
        }
        this.pos++;
        return { type: 'ERROR', value: '!', line: this.line };
      }
      if (char === '+') {
        if (this.input[this.pos + 1] === '+') {
          this.pos += 2;
          return { type: 'PLUS', value: '++', line: this.line };
        }
        this.pos++;
        return { type: 'PLUS', value: '+', line: this.line };
      }
      if (char === '-') {
        if (this.input[this.pos + 1] === '-') {
          this.pos += 2;
          return { type: 'MINUS', value: '--', line: this.line };
        }
        this.pos++;
        return { type: 'MINUS', value: '-', line: this.line };
      }
      if (char === '*') {
        this.pos++;
        return { type: 'MUL', value: '*', line: this.line };
      }
      if (char === '/') {
        this.pos++;
        return { type: 'DIV', value: '/', line: this.line };
      }
      if (char === '(') {
        this.pos++;
        return { type: 'LPAREN', value: '(', line: this.line };
      }
      if (char === ')') {
        this.pos++;
        return { type: 'RPAREN', value: ')', line: this.line };
      }
      if (char === '{') {
        this.pos++;
        return { type: 'LBRACE', value: '{', line: this.line };
      }
      if (char === '}') {
        this.pos++;
        return { type: 'RBRACE', value: '}', line: this.line };
      }
      if (char === ';') {
        this.pos++;
        return { type: 'SEMICOLON', value: ';', line: this.line };
      }
      if (char === ',') {
        this.pos++;
        return { type: 'COMMA', value: ',', line: this.line };
      }
      if (char === '.') {
        this.pos++;
        return { type: 'DOT', value: '.', line: this.line };
      }
      if (char === '[') {
        this.pos++;
        return { type: 'LBRACKET', value: '[', line: this.line };
      }
      if (char === ']') {
        this.pos++;
        return { type: 'RBRACKET', value: ']', line: this.line };
      }
      if (char === '&') {
        this.pos++;
        return { type: 'AMPERSAND', value: '&', line: this.line };
      }
      if (char === '#') {
        this.pos++;
        return { type: 'HASH', value: '#', line: this.line };
      }
      if (char === '<') {
        if (this.input[this.pos + 1] === '=') {
          this.pos += 2;
          return { type: 'LE', value: '<=', line: this.line };
        }
        this.pos++;
        return { type: 'LT', value: '<', line: this.line };
      }
      if (char === '>') {
        if (this.input[this.pos + 1] === '=') {
          this.pos += 2;
          return { type: 'GE', value: '>=', line: this.line };
        }
        this.pos++;
        return { type: 'GT', value: '>', line: this.line };
      }

      // Handle unknown characters
      this.errors.push({
        message: `Lexical Error: Unexpected character '${char}'`,
        line: this.line,
        type: 'Lexical'
      });
      this.pos++;
    }

    return { type: 'EOF', value: '', line: this.line };
  }

  getErrors() {
    return this.errors;
  }

  peekToken(): Token {
    const oldPos = this.pos;
    const oldLine = this.line;
    const oldErrors = [...this.errors];
    const token = this.nextToken();
    this.pos = oldPos;
    this.line = oldLine;
    this.errors = oldErrors;
    return token;
  }
}
