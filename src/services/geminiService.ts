import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CompilerErrorReport {
  success: boolean;
  enhancedErrors: {
    line: number;
    type: string;
    explanation: string;
    suggestions: string[];
  }[];
  correctedCode?: string;
}

export async function explainCompilerErrors(params: {
  sourceCode: string;
  compilerErrors: { message: string; line: number; type: string }[];
}, retryCount = 0): Promise<CompilerErrorReport> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      success: params.compilerErrors.length === 0,
      enhancedErrors: params.compilerErrors.map(e => ({
        line: e.line,
        type: e.type,
        explanation: "AI Analysis is unavailable because the API Key is missing.",
        suggestions: ["Set the GEMINI_API_KEY environment variable in your deployment settings."]
      }))
    };
  }
  
  const prompt = `
    You are an expert C compiler assistant.
    
    SOURCE CODE:
    ${params.sourceCode}
    
    COMPILER ERRORS:
    ${JSON.stringify(params.compilerErrors, null, 2)}
    
    YOUR GOAL:
    1. Analyze the source code and the reported errors.
    2. Explain each error clearly so a student can learn.
    3. Provide a corrected version of the code in the 'correctedCode' field.
    
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
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      return explainCompilerErrors(params, retryCount + 1);
    }
    
    return {
      success: params.compilerErrors.length === 0,
      enhancedErrors: params.compilerErrors.map(e => ({
        line: e.line,
        type: e.type,
        explanation: e.message,
        suggestions: ["Check your syntax and variable declarations."]
      }))
    };
  }
}
