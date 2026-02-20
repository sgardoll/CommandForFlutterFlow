<p align="center">
  <img src="https://img.shields.io/badge/FlutterFlow-Custom_Code-6366f1?style=for-the-badge&logo=flutter&logoColor=white" alt="FlutterFlow Custom Code"/>
  <img src="https://img.shields.io/badge/Powered_by-Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">FlutterFlow Custom Code Connect</h1>

<p align="center">
  <strong>Break through FlutterFlow's complexity ceiling.</strong><br/>
  AI-powered custom code generation that actually works in FlutterFlow.
  Watch the full tutorial video by clicking below.
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=zRjexvW58IQ">
    <img src="https://img.youtube.com/vi/zRjexvW58IQ/hqdefault.jpg" alt="Watch the video" width="560">
  </a>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=zRjexvW58IQ">
    <img src="https://img.shields.io/badge/YouTube-Demo-red" alt="YouTube Demo">
  </a>
</p>

<p align="center">
  <a href="#the-problem">The Problem</a> •
  <a href="#the-solution">The Solution</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## The Problem

FlutterFlow is incredible for building apps fast. Until you hit **the wall**.

You need a custom radial gauge. A signature pad. An audio visualizer. A chart that doesn't exist in the component library. Suddenly, you're staring at a "Custom Widget" editor with zero guidance.

**The pain points:**
- AI tools generate Flutter code that **breaks** in FlutterFlow
- `void main()` and `Scaffold` wrappers that won't compile
- Import statements that cause "Unknown Import" errors
- Data classes that don't match FlutterFlow's Struct system
- Hours of debugging cryptic build failures
- Manual copy-paste workflow between tools

**What if your AI actually understood FlutterFlow's constraints?**

---

## The Solution

**FlutterFlow Custom Code Connect** is a specialized code generation pipeline built from the ground up for FlutterFlow compatibility.

It doesn't just generate Flutter code. It generates **FlutterFlow-ready artifacts** that paste directly into the Custom Code editor—or deploy automatically via the FlutterFlow API.

<p align="center">
  <img src="https://img.shields.io/badge/Step_1-Prompt_Architect-818cf8?style=flat-square" alt="Step 1"/>
  <img src="https://img.shields.io/badge/Step_2-Code_Generator-6366f1?style=flat-square" alt="Step 2"/>
  <img src="https://img.shields.io/badge/Step_3-Code_Review-4f46e5?style=flat-square" alt="Step 3"/>
</p>

---

## Features

### Artifact-Aware Generation

Automatically determines whether your request needs a **Custom Function**, **Custom Action**, **Custom Widget**, or **Code File**—and applies the correct constraints for each.

| Artifact Type | What It's For | Key Constraints |
|---------------|---------------|-----------------|
| **Custom Function** | Sync logic, math, formatting | No external packages, pure Dart only |
| **Custom Action** | Async operations, APIs, side effects | Must return `Future<T>`, can use packages |
| **Custom Widget** | Visual components, charts, gestures | Must handle `width`/`height` params, use LayoutBuilder |
| **Code File** | Reusable models, enums, utilities | No generics, no function-typed fields |

### Direct FlutterFlow Deployment

Skip the copy-paste workflow. Connect your FlutterFlow API key and deploy directly:

- **One-click commit** from the UI to your FlutterFlow project
- **Automatic pubspec.yaml** dependency management
- **Pre-commit validation** catches issues before they hit FlutterFlow
- **Production & Staging** endpoint support
- **Project selection** from your FlutterFlow account

### Built-in Guardrails

Every line of generated code is checked against FlutterFlow's rigid architecture:

- No `main()`, `runApp()`, `MaterialApp`, or `Scaffold`
- No import statements in Functions (FlutterFlow manages these)
- Proper null safety with `??` and `?.` operators
- FlutterFlow Structs instead of custom Dart classes
- `FlutterFlowTheme.of(context)` instead of hardcoded colors
- Correct callback signatures with `Future<dynamic> Function()?`
- Proper `dispose()` for controllers
- No generics or function-typed fields in Code Files

### Actionable Code Review

The **Code Review** stage doesn't just find problems—it tells you exactly what to fix:

```
## Overall Score: 75/100

## Critical Issues
- Found `import 'package:flutter/material.dart'` on line 1
  → Remove this. FlutterFlow manages imports automatically.

## Required User Actions in FlutterFlow
- Add to Dependencies: `google_fonts: ^6.1.0`
- Create Data Type: `GaugeZoneStruct` with fields:
  - color (Color)
  - startAngle (Double)
  - endAngle (Double)
```

### Multi-Model Support

Choose your AI backend:
- **Gemini 3.0 Pro** (default, primary)
- **Claude 4.6 Opus** (optional)
- **GPT-5.3-Codex** (optional)
- **OpenRouter: Auto Router** (route to best available model)
- **OpenRouter: Free Models** (cost-optimized routing)

Each model receives optimized prompts tailored to its strengths, with automatic fallback to Gemini 3.0 Flash if the primary model fails.

### Smart Refinement

When FlutterFlow returns build errors, the **Regenerate with Errors** feature:
- Parses FlutterFlow's error messages
- Feeds them back to the AI with context
- Generates corrected code automatically
- Preserves your original intent while fixing issues

### Secure API Key Storage

Your API keys are encrypted using the Web Crypto API:
- Device-specific encryption keys
- AES-GCM encryption for stored keys
- Keys never transmitted to our servers
- Automatic key validation and status indicators

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/sgardoll/CustomCodeConnectForFlutterFlow.git
cd CustomCodeConnectForFlutterFlow
npm install
```

### 2. Configure API Keys

Create a `.env` file in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_ANTHROPIC_API_KEY=optional_for_claude
VITE_OPENAI_API_KEY=optional_for_gpt
VITE_OPENROUTER_API_KEY=optional_for_openrouter
```

Get your API keys:
- **Gemini**: [Google AI Studio](https://aistudio.google.com/apikey)
- **FlutterFlow** (for deployment): [Settings → API Access](https://app.flutterflow.io/settings/api)

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## How It Works

### The Three-Step Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         YOUR PROMPT                                  │
│            "Create a radial gauge with colored zones"                │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 1: PROMPT ARCHITECT                          │
│                                                                      │
│  Analyzes your request and outputs a JSON specification:            │
│  • Artifact Type: CustomWidget                                       │
│  • Parameters: width, height, currentValue, zones, onValueChanged    │
│  • Data Types Needed: GaugeZoneStruct                                │
│  • Constraints: Must handle null dimensions, use LayoutBuilder       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 2: CODE GENERATOR                            │
│                                                                      │
│  Receives the spec + FlutterFlow constraints → Outputs Dart code    │
│  • Strict null safety                                                │
│  • No forbidden patterns (main, Scaffold, imports)                   │
│  • FlutterFlowTheme integration                                      │
│  • Proper dispose() for controllers                                  │
│  • Model-optimized prompting (different per AI provider)             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 3: CODE REVIEW                               │
│                                                                      │
│  Audits the generated code for FF compatibility:                    │
│  • Scores 0-100 based on compliance                                  │
│  • Lists critical issues that block compilation                      │
│  • Provides before/after code transformations                        │
│  • Lists required user actions in FlutterFlow UI                     │
│  • Suggests dependencies to add to pubspec.yaml                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    READY TO DEPLOY                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐                   │
│  │   Copy to Clipboard │  │  Commit to FF       │                   │
│  │   (Manual workflow) │  │  (Direct deploy)    │                   │
│  └─────────────────────┘  └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Example Prompts

**Custom Widget:**
> "Create a circular progress indicator with a gradient stroke and animated percentage text in the center. It should accept a `progress` value from 0-100 and an optional `onComplete` callback."

**Custom Action:**
> "Write an action that compresses an image using the flutter_image_compress package and returns the compressed file bytes as a Uint8List."

**Custom Function:**
> "Create a function that validates a credit card number using the Luhn algorithm and returns true/false."

**Code File:**
> "Create a data class called UserProfile with fields for name, email, avatarUrl, and createdAt. Include a toJson and fromJson method."

---

## Deployment

### Direct Commit to FlutterFlow

1. Open the **API Keys** modal (settings icon in sidebar)
2. Add your **FlutterFlow API Key** and **Project ID**
3. Select your project from the dropdown (or enter manually)
4. Choose **Production** or **Staging** endpoint
5. Run the pipeline to generate code
6. Click **Commit to FlutterFlow**

The tool will:
- Validate the code against FlutterFlow rules
- Extract dependencies for pubspec.yaml
- Create a zip archive with proper file structure
- Push to FlutterFlow via the API
- Show success/error feedback

### Manual Deployment

If you prefer manual control:
1. Copy the generated code from the Code Generator step
2. Paste into FlutterFlow's Custom Code editor
3. Add any required dependencies to pubspec.yaml
4. Create any required Data Types in FlutterFlow

---

## Tech Stack

- **Frontend:** Vanilla JavaScript + Tailwind CSS (via CDN)
- **Build Tool:** Vite 5.x
- **AI APIs:** Google Gemini (primary), Anthropic Claude, OpenAI GPT, OpenRouter (optional)
- **FlutterFlow API:** Direct integration for deployment
- **Encryption:** Web Crypto API (AES-GCM)
- **Archive Creation:** JSZip
- **Syntax Highlighting:** Highlight.js
- **Fonts:** Inter (UI), JetBrains Mono (code)

---

## Project Structure

```
├── index.html          # UI structure, Tailwind styles, templates
├── app.js              # All application logic (single file)
├── vite.config.js      # Dev server, API proxies
├── package.json        # Project config & scripts
├── AGENTS.md           # Context for AI assistants
├── README.md           # This file
├── LICENSE             # MIT License
└── .env                # API keys (gitignored)
```

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

<p align="center">
  <strong>Stop fighting FlutterFlow. Start building.</strong>
</p>

<p align="center">
  <a href="https://github.com/sgardoll/CustomCodeConnectForFlutterFlow/issues">Report Bug</a> •
  <a href="https://github.com/sgardoll/CustomCodeConnectForFlutterFlow/issues">Request Feature</a>
</p>
