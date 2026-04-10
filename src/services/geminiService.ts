import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CompilerErrorReport {
  success: boolean;
  enhancedErrors: {
    line: number;
    type: string;
    explanation: string;
    suggestions: string[];
  }[];
  correctedCode: string;
}

export async function explainCompilerErrors(params: {
  sourceCode: string;
  compilerErrors: { message: string; line: number; type: string }[];
}, retryCount = 0): Promise<CompilerErrorReport> {
  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API Key is missing. Please set GEMINI_API_KEY or VITE_GEMINI_API_KEY in your environment.");
    return {
      success: params.compilerErrors.length === 0,
      enhancedErrors: params.compilerErrors.map(e => ({
        line: e.line,
        type: e.type,
        explanation: "AI Analysis is unavailable because the API Key is missing.",
        suggestions: ["Set the GEMINI_API_KEY environment variable in your deployment settings."]
      })),
      correctedCode: params.sourceCode
    };
  }
  
  const genAI = new GoogleGenAI({ apiKey });
  
  const prompt = `
    ACT AS: A Senior C Compiler Engineer and Tutor.
    
    CONTEXT:
    The user is writing C code in a custom compiler educational tool. 
    The tool's basic pipeline has identified several errors (Lexical, Syntax, or Semantic).
    
    YOUR GOAL:
    1. Analyze the source code and the reported errors.
    2. Explain each error clearly so a student can learn.
    3. CRITICAL: Provide the FULL, CORRECTED version of the source code.
    4. MAGIC KEY REQUIREMENT: You MUST fix all syntax, lexical, and semantic errors. For example, if a semicolon is missing, you MUST add it. If a variable is undeclared, you MUST declare it.
    5. FOR EACH FIX: Add a comment on the same line or above the fixed line explaining what was changed (e.g., "// FIXED: Added missing semicolon").
    
    STRICT RULES FOR "correctedCode":
    - It MUST be the full source code.
    - It MUST be 100% valid C code.
    - If you return the same code as the input when there are reported errors, you have failed.
    
    SOURCE CODE TO FIX:
    ${params.sourceCode}
    
    REPORTED ERRORS:
    ${JSON.stringify(params.compilerErrors, null, 2)}
    
    STRICT REQUIREMENTS FOR "success":
    - Set "success" to false if there are ANY errors in the source code, even if you fix them in "correctedCode".
    - Set "success" to true ONLY if the original source code is 100% correct and requires no changes.
    
    STRICT REQUIREMENTS FOR "correctedCode":
    - It MUST be the full source code.
    - It MUST have all reported errors fixed (e.g., add missing semicolons, declare variables, fix types).
    - It MUST be valid, compilable C code.
    - DO NOT return the original code if it contains errors. If you return the original code without fixing the reported errors, you have failed the task.
    
    OUTPUT FORMAT:
    Return ONLY a JSON object matching this schema:
    {
      "success": boolean,
      "enhancedErrors": [
        {
          "line": number,
          "type": "Lexical" | "Syntax" | "Semantic",
          "explanation": "Clear explanation of the error",
          "suggestions": ["Step-by-step fix suggestions"]
        }
      ],
      "correctedCode": "The complete fixed source code"
    }
  `;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class C compiler expert. Your primary mission is to provide perfectly corrected code with inline comments explaining each fix. You take the user's broken C code and return a version that is 100% correct and includes comments like '// FIXED: ...' for every change made. Never return the original buggy code in the 'correctedCode' field if it has errors.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            success: { type: Type.BOOLEAN },
            enhancedErrors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  line: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  suggestions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["line", "type", "explanation", "suggestions"]
              }
            },
            correctedCode: { type: Type.STRING }
          },
          required: ["success", "enhancedErrors", "correctedCode"]
        }
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error(`Gemini API Error (Attempt ${retryCount + 1}):`, error);
    
    if (retryCount < 2) {
      // Small delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return explainCompilerErrors(params, retryCount + 1);
    }
    
    // Fallback to basic error reporting if AI fails
    return {
      success: params.compilerErrors.length === 0,
      enhancedErrors: params.compilerErrors.map(e => ({
        line: e.line,
        type: e.type,
        explanation: e.message,
        suggestions: ["Check your syntax and variable declarations."]
      })),
      correctedCode: params.sourceCode
    };
  }
}
