# 🧠 SyntaxSculptorPro

A professional-grade **compiler pipeline simulator** built with React + TypeScript, featuring real Lexical, Syntax, and Semantic analysis with intelligent error detection and automatic code correction.

---

## ✨ Features

- 🔍 **Lexical Analysis** — Tokenizes source code and detects lexical errors
- 🌳 **Syntax Analysis** — Parses tokens into an Abstract Syntax Tree (AST)
- 🧩 **Semantic Analysis** — Checks variable declarations, scoping, and usage
- ⚙️ **IR Generation** — Converts AST into Intermediate Representation (IR)
- 🚀 **Optimizer** — Performs IR-level optimizations
- 🖥️ **Code Generation** — Generates assembly-like output from optimized IR
- 🔧 **Error Fixer** — Explains compiler errors and suggests corrected code
- 💾 **Save & Download** — Save code to local storage or download as a `.c` file

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | Frontend UI |
| Vite | Build tool & dev server |
| Tailwind CSS v4 | Styling |
| Framer Motion | Animations |
| Lucide React | Icons |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+

### Installation

```bash
# Clone the repository
git clone https://github.com/rahulraj000019/wq-syntaxsculptorpro.git
cd wq-syntaxsculptorpro

# Install dependencies
npm install
```

### Run Locally

```bash
npm run dev
```

Open your browser at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

---

## 📁 Project Structure

```
src/
├── App.tsx                  # Main application UI
├── lib/
│   └── compiler/
│       ├── lexer.ts         # Lexical analysis
│       ├── parser.ts        # Syntax analysis & AST generation
│       ├── semantic.ts      # Semantic analysis & symbol table
│       ├── ir.ts            # Intermediate Representation
│       ├── optimizer.ts     # IR optimization
│       ├── codegen.ts       # Assembly code generation
│       ├── ast.ts           # AST node type definitions
│       └── fixer.ts         # Code auto-fix utilities
```

---

## ⚙️ How the Compiler Pipeline Works

```
Source Code
    │
    ▼
[ Lexer ]  →  Tokens + Lexical Errors
    │
    ▼
[ Parser ]  →  AST + Syntax Errors
    │
    ▼
[ Semantic Analyzer ]  →  Symbol Table + Semantic Errors
    │
    ▼
[ IR Generator ]  →  Intermediate Representation
    │
    ▼
[ Optimizer ]  →  Optimized IR
    │
    ▼
[ Code Generator ]  →  Assembly Output
```

---

## 👨‍💻 Contributors

| Name | Role |
|---|---|
| **Anjali Singh** | Team Lead |
| **Rahul Raj** | Developer |
| **Hitesh** | Developer |
| **Vasu Singh** | Developer |

---

## 📄 License

This project is licensed under the **Apache-2.0 License**.
