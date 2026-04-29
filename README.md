🚀 Syntax Pro – Compiler Design & Analysis System
📌 Overview

Syntax Pro is a web-based compiler simulation system that demonstrates the complete working of a compiler pipeline. It performs all major phases of compilation, from lexical analysis to code generation, and provides detailed insights into how source code is processed internally.

This project is designed to help understand core concepts of Compiler Design in a practical and interactive way.

✨ Features
🔍 Compiler Phases Implemented
Lexical Analysis – Tokenization of input code
Syntax Analysis – Parsing and AST generation
Semantic Analysis – Variable checking and validation
Intermediate Code Generation (IR)
Code Optimization – Constant folding
Code Generation – Assembly-like output
💻 Interface Features
Interactive code editor
Line-by-line error reporting
Real-time compilation pipeline status
Code saving and downloading functionality
Automatic correction for common syntax errors
🛠️ Tech Stack
Frontend: React, TypeScript, Tailwind CSS
Build Tool: Vite
Backend/Services: Node.js (Express)
Language Used: TypeScript
📂 Project Structure
syntax-pro/
│── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── lib/compiler/
│   │   ├── lexer.ts
│   │   ├── parser.ts
│   │   ├── semantic.ts
│   │   ├── ast.ts
│   │   ├── ir.ts
│   │   ├── optimizer.ts
│   │   ├── codegen.ts
│   │   └── fixer.ts
│   └── services/
│       └── geminiService.ts
│
│── index.html
│── package.json
│── vite.config.ts
│── .env.example
⚙️ Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/your-username/syntax-pro.git
cd syntax-pro
2️⃣ Install Dependencies
npm install
3️⃣ Setup Environment Variables

Create a .env file in the root directory:

GEMINI_API_KEY=your_api_key_here
▶️ Run the Project
npm run dev

Open in browser:

http://localhost:3000
🔄 Compilation Workflow
Source Code
   ↓
Lexical Analysis
   ↓
Syntax Analysis (AST)
   ↓
Semantic Analysis
   ↓
Intermediate Code (IR)
   ↓
Optimization
   ↓
Code Generation (Assembly)
🧪 Sample Input
int x;
x = 10 + 5 * 2;
int y;
y = x + 10;
📊 Output
Intermediate Representation (IR)
Optimized Code
Assembly Code
Error Reports with Line Numbers
Suggested Fixes
🎯 Objectives
To demonstrate how a compiler works internally
To implement core compiler design concepts
To provide a visual and interactive learning tool
🚀 Future Enhancements
Support for more programming constructs
Advanced optimization techniques
Execution simulation
Debugging support
👨‍💻 Contributors
Anjali Singh (Team Lead)
Rahul Raj
Hitesh
Vasu Singh
