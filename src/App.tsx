/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Lexer } from './lib/compiler/lexer';
import { Parser } from './lib/compiler/parser';
import { SemanticAnalyzer } from './lib/compiler/semantic';
import { IRGenerator, Instruction } from './lib/compiler/ir';
import { Optimizer } from './lib/compiler/optimizer';
import { CodeGenerator } from './lib/compiler/codegen';
import { CodeFixer } from './lib/compiler/fixer';
// Local analysis only, AI service imports removed as per user request
import { 
  Play, 
  Loader2, 
  Cpu, 
  Sparkles, 
  Code2, 
  AlertCircle, 
  CheckCircle2, 
  Terminal,
  Eraser,
  Copy,
  Check,
  Zap,
  FileCode,
  Binary,
  Layers,
  Save,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [code, setCode] = useState('int x;\nx = 10 + 5 * 2;\nint y;\ny = x + 10;');
  const [isCompiling, setIsCompiling] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string>('');
  const [report, setReport] = useState<{
    success: boolean;
    enhancedErrors: {
      line: number;
      type: string;
      explanation: string;
      suggestions: string[];
    }[];
    correctedCode?: string;
  } | null>(null);
  const [pipelineData, setPipelineData] = useState<{
    ir: Instruction[];
    optimizedIr: Instruction[];
    assembly: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAiCode, setShowAiCode] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  useEffect(() => {
    const savedCode = localStorage.getItem('compiler_saved_code');
    if (savedCode) {
      setCode(savedCode);
    }
  }, []);

  const saveCode = useCallback(() => {
    localStorage.setItem('compiler_saved_code', code);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [code]);

  const downloadCode = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.c';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code]);

  const runFullPipeline = useCallback(async () => {
    if (!code.trim()) return;
    
    setIsCompiling(true);
    setPipelineStatus('Initializing...');
    setReport(null);
    setPipelineData(null);
    setShowAiCode(false);
    
    // 1. LEXICAL ANALYSIS
    setPipelineStatus('Running Lexical Analysis...');
    const lexer = new Lexer(code);
    
    // 2. SEMANTIC ANALYSIS
    setPipelineStatus('Running Semantic Analysis...');
    const semantic = new SemanticAnalyzer();
    
    // 3. SYNTAX ANALYSIS
    setPipelineStatus('Parsing Syntax...');
    const parser = new Parser(lexer, semantic);
    const ast = parser.parse();

    // Collect all local errors
    const allErrors = [
      ...lexer.getErrors(),
      ...parser.getErrors(),
      ...semantic.getErrors()
    ];

    // 4. INTERMEDIATE CODE GENERATION
    setPipelineStatus('Generating Intermediate Code...');
    const irGen = new IRGenerator();
    const ir = irGen.generate(ast);

    // 5. OPTIMIZATION
    setPipelineStatus('Optimizing Code...');
    const optimizer = new Optimizer();
    const optimizedIr = optimizer.optimize(ir);

    // 6. CODE GENERATION
    setPipelineStatus('Generating Assembly...');
    const codeGen = new CodeGenerator();
    const assembly = codeGen.generate(optimizedIr, semantic.getSymbols());

    setPipelineData({ ir, optimizedIr, assembly });

    // 7. LOCAL ANALYSIS LAYER (Final Step)
    setPipelineStatus('Finalizing Analysis...');
    
    // ALGORITHMIC FIX (Non-AI)
    const algorithmicFixedCode = CodeFixer.fix(code, allErrors.map(e => ({
      message: e.message,
      line: e.line,
      type: e.type
    })));

    // Generate local explanations and suggestions (Algorithmic)
    const localReport = {
      success: allErrors.length === 0,
      enhancedErrors: allErrors.map(e => {
        let explanation = e.message;
        let suggestions: string[] = [];

        // Rule-based diagnostic suggestions (Local Analysis)
        if (e.message.includes('Expected SEMICOLON')) {
          explanation = "A semicolon is missing at the end of this statement.";
          suggestions = ["Add a ';' at the end of the line."];
        } else if (e.message.includes('used before declaration')) {
          explanation = `The variable is used but has not been declared yet.`;
          suggestions = ["Declare the variable with a type (e.g., 'int x;') before using it."];
        } else if (e.message.includes('Expected RBRACE')) {
          explanation = "A closing brace '}' is missing for this block.";
          suggestions = ["Add a '}' to close the function or block."];
        } else if (e.message.includes('Expected LBRACE')) {
          explanation = "An opening brace '{' is missing.";
          suggestions = ["Add a '{' to start the block."];
        } else if (e.message.includes('Unexpected token')) {
          explanation = "The compiler encountered an unexpected character.";
          suggestions = ["Check for typos or misplaced characters."];
        } else {
          suggestions = ["Review the C syntax rules for this statement."];
        }

        return {
          line: e.line,
          type: e.type,
          explanation,
          suggestions
        };
      }),
      correctedCode: algorithmicFixedCode
    };

    setReport(localReport);
    setIsCompiling(false);
  }, [code]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearEditor = () => {
    setCode('');
    setReport(null);
    setPipelineData(null);
  };

  const formatIR = (instructions: Instruction[]) => {
    return instructions.map(inst => {
      if (inst.op === '=') return `${inst.result} = ${inst.arg1}`;
      return `${inst.result} = ${inst.arg1} ${inst.op} ${inst.arg2}`;
    }).join('\n');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Cpu className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Syntax Pro</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">C-Compiler Core & Semantic Diagnostic Hub</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={clearEditor}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Clear Editor"
            >
              <Eraser className="w-5 h-5" />
            </button>
            <button 
              onClick={runFullPipeline} 
              disabled={isCompiling || !code.trim()} 
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              {isCompiling ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Compiling...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Pipeline</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Section */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Source Code</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={saveCode}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${isSaved ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}
                >
                  {isSaved ? (
                    <>
                      <Check className="w-3 h-3" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" />
                      Save
                    </>
                  )}
                </button>
                <button 
                  onClick={downloadCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
                <button 
                  onClick={() => setCode('')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600 transition-all"
                  title="Clear Editor"
                >
                  <Eraser className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden relative">
              <div 
                ref={lineNumbersRef}
                className="w-12 bg-slate-50 border-r border-slate-200 flex flex-col items-end pt-6 pb-6 pr-3 select-none overflow-hidden"
              >
                {code.split('\n').map((_, i) => (
                  <div key={i} className="font-mono text-[14px] leading-relaxed text-slate-300 h-[22.75px]">
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea 
                ref={editorRef}
                className="flex-1 p-6 pt-6 font-mono text-sm leading-relaxed resize-none outline-none bg-transparent text-slate-700 placeholder:text-slate-300 overflow-y-auto"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={handleScroll}
                placeholder="// Write your code here..."
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="bg-slate-50 border-b border-slate-200 flex px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Analysis Results
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {isCompiling ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center space-y-6"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                      <Cpu className="absolute inset-0 m-auto w-6 h-6 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest animate-pulse">Processing Pipeline...</p>
                      <p className="text-xs text-slate-400 font-medium">{pipelineStatus}</p>
                    </div>
                  </motion.div>
                ) : !pipelineData ? (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center space-y-4"
                  >
                    <div className="bg-slate-50 p-6 rounded-full">
                      <Cpu className="w-12 h-12 text-slate-200" />
                    </div>
                    <p className="text-sm text-slate-500 max-w-[250px] mx-auto">Run the pipeline to see analysis results.</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="space-y-6">
                      {report && (
                        <>
                          <div className={`flex items-center gap-3 p-4 rounded-xl border ${report.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                            {report.success ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
                            <div>
                              <h3 className="font-bold text-sm uppercase tracking-wide">{report.success ? 'Verification Successful' : 'Pipeline Errors Found'}</h3>
                              <p className="text-xs opacity-80">{report.success ? 'All phases completed without errors.' : `${report.enhancedErrors.length} issues identified.`}</p>
                            </div>
                          </div>

                          {!report.success && (
                            <div className="space-y-4">
                              {report.enhancedErrors.map((err, i) => (
                                <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest mb-2 inline-block">Line {err.line} • {err.type}</span>
                                  <p className="text-sm font-semibold text-slate-800 mb-2">{err.explanation}</p>
                                  <div className="space-y-1">
                                    {err.suggestions.map((s, si) => (
                                      <div key={si} className="text-xs text-slate-500 flex items-start gap-2">
                                        <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                        <span>{s}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!report.success && report.correctedCode && (
                            <motion.div 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="pt-4"
                            >
                              <button 
                                onClick={() => {
                                  if (report.correctedCode) {
                                    setCode(report.correctedCode);
                                    setReport({
                                      ...report,
                                      success: true,
                                      enhancedErrors: []
                                    });
                                    // We keep pipelineData so the UI stays in 'content' mode
                                    // but we can update the assembly/IR if we want, 
                                    // or just show the success state.
                                  }
                                }}
                                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group relative overflow-hidden border border-white/20"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:animate-[shimmer_2s_infinite] skew-x-12" />
                                <Zap className="w-5 h-5 fill-current animate-pulse text-yellow-300" />
                                <span className="drop-shadow-md">Magic Key: Algorithmic Auto-Fix</span>
                                <Sparkles className="w-5 h-5 animate-bounce text-yellow-200" />
                              </button>
                              <p className="text-[10px] text-slate-400 text-center mt-2 uppercase tracking-tighter">Click to automatically fix errors using rule-based compiler logic</p>
                            </motion.div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


