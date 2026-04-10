export interface CompilerError {
  message: string;
  line: number;
  type: string;
}

export class CodeFixer {
  static fix(code: string, errors: CompilerError[]): string {
    let lines = code.split('\n');
    let fixedCode = [...lines];
    
    const missingVars = new Set<string>();
    const missingSemicolons = new Set<number>();
    let missingClosingBraces = 0;

    // 1. Pre-processing: Check for common missing headers
    if (code.includes('printf') && !code.includes('#include <stdio.h>')) {
      fixedCode.unshift('#include <stdio.h> // FIXED: Added missing header for printf');
    }

    // 2. Pre-processing: Check for missing main wrapper (if code looks like it should be in main)
    if (!code.includes('main') && (code.includes('printf') || code.includes('int ') || code.includes('='))) {
      fixedCode.unshift('int main() {');
      fixedCode.push('    return 0;');
      fixedCode.push('} // FIXED: Wrapped code in main function');
    }

    // 3. Fix common main function signature issues
    for (let i = 0; i < fixedCode.length; i++) {
      if (fixedCode[i].includes('main') && !fixedCode[i].includes('(')) {
        fixedCode[i] = fixedCode[i].replace('main', 'main()') + ' // FIXED: Added missing parentheses to main';
      }
      if (fixedCode[i].trim().startsWith('main()')) {
        fixedCode[i] = fixedCode[i].replace('main()', 'int main()') + ' // FIXED: Added missing int return type to main';
      }
    }

    for (const error of errors) {
      // Detect Missing Semicolons
      if (error.message.includes('Expected SEMICOLON')) {
        missingSemicolons.add(error.line);
      }
      
      // Detect Undeclared Variables
      if (error.message.includes('used before declaration')) {
        const match = error.message.match(/'([^']+)'/);
        if (match) {
          missingVars.add(match[1]);
        }
      }

      // Detect Missing Braces
      if (error.message.includes('Expected RBRACE')) {
        missingClosingBraces++;
      }
    }

    // Apply fixes
    
    // Fix Semicolons
    for (const lineNum of missingSemicolons) {
      const idx = lineNum - 1;
      // Adjust index if we added lines at the top
      const adjustedIdx = idx + (fixedCode.length - lines.length);
      
      if (adjustedIdx >= 0 && adjustedIdx < fixedCode.length) {
        const line = fixedCode[adjustedIdx].trimEnd();
        if (line && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}')) {
          fixedCode[adjustedIdx] = fixedCode[adjustedIdx].trimEnd() + '; // FIXED: Added missing semicolon';
        } else if (adjustedIdx > 0) {
          const prevLine = fixedCode[adjustedIdx - 1].trimEnd();
          if (prevLine && !prevLine.endsWith(';') && !prevLine.endsWith('{') && !prevLine.endsWith('}')) {
            fixedCode[adjustedIdx - 1] = fixedCode[adjustedIdx - 1].trimEnd() + '; // FIXED: Added missing semicolon';
          }
        }
      }
    }

    // Fix Missing Declarations
    if (missingVars.size > 0) {
      let insertIdx = 0;
      for (let i = 0; i < fixedCode.length; i++) {
        if (fixedCode[i].includes('main') && fixedCode[i].includes('{')) {
          insertIdx = i + 1;
          break;
        }
      }
      
      const declarations = Array.from(missingVars).map(v => `    int ${v} = 0; // FIXED: Auto-declared missing variable`);
      fixedCode.splice(insertIdx, 0, ...declarations);
    }

    // Fix Missing Braces
    const openBraces = (fixedCode.join('\n').match(/{/g) || []).length;
    const closeBraces = (fixedCode.join('\n').match(/}/g) || []).length;
    const diff = openBraces - closeBraces;
    
    for (let i = 0; i < diff; i++) {
      fixedCode.push('} // FIXED: Added missing closing brace');
    }

    // 4. Post-processing: Basic Typo Correction
    for (let i = 0; i < fixedCode.length; i++) {
      if (fixedCode[i].includes('print(') && !fixedCode[i].includes('printf(')) {
        fixedCode[i] = fixedCode[i].replace('print(', 'printf(') + ' // FIXED: Corrected print to printf';
      }
    }

    return fixedCode.join('\n');
  }
}
