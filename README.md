<p align="center">
  <img src="https://img.shields.io/badge/FlutterFlow-Custom_Code-6366f1?style=for-the-badge&logo=flutter&logoColor=white" alt="FlutterFlow Custom Code"/>
  <img src="https://img.shields.io/badge/Powered_by-Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">FlutterFlow Custom Code Command</h1>

<p align="center">
  <strong>Break through FlutterFlow's complexity ceiling.</strong><br/>
  AI-powered custom code generation that actually works in FlutterFlow.
</p>

<p align="center">
  <a href="#the-problem">The Problem</a> •
  <a href="#the-solution">The Solution</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a>
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

**What if your AI actually understood FlutterFlow's constraints?**

---

## The Solution

**FlutterFlow Custom Code Command** is a specialized code generation pipeline built from the ground up for FlutterFlow compatibility.

It doesn't just generate Flutter code. It generates **FlutterFlow-ready artifacts** that paste directly into the Custom Code editor and compile on the first try.

<p align="center">
  <img src="https://img.shields.io/badge/Step_1-Prompt_Architect-818cf8?style=flat-square" alt="Step 1"/>
  <img src="https://img.shields.io/badge/Step_2-Code_Generator-6366f1?style=flat-square" alt="Step 2"/>
  <img src="https://img.shields.io/badge/Step_3-Code_Dissector-4f46e5?style=flat-square" alt="Step 3"/>
</p>

---

## Features

### Artifact-Aware Generation

Automatically determines whether your request needs a **Custom Function**, **Custom Action**, or **Custom Widget**—and applies the correct constraints for each.

| Artifact Type | What It's For | Key Constraints |
|---------------|---------------|-----------------|
| **Custom Function** | Sync logic, math, formatting | No external packages, pure Dart only |
| **Custom Action** | Async operations, APIs, side effects | Must return `Future<T>`, can use packages |
| **Custom Widget** | Visual components, charts, gestures | Must handle `width`/`height` params, use LayoutBuilder |

### Built-in Guardrails

Every line of generated code is checked against FlutterFlow's rigid architecture:

- No `main()`, `runApp()`, `MaterialApp`, or `Scaffold`
- No import statements (FlutterFlow manages these)
- Proper null safety with `??` and `?.` operators
- FlutterFlow Structs instead of custom Dart classes
- `FlutterFlowTheme.of(context)` instead of hardcoded colors
- Correct callback signatures with `Future<dynamic> Function()?`
- Proper `dispose()` for controllers

### Actionable Audit Reports

The **Code Dissector** doesn't just find problems—it tells you exactly what to fix:

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
- **Gemini 3.0 Flash** (default, fastest)
- **Gemini 2.5 Flash** (fallback)
- **Claude 4.5 Opus** (optional)
- **GPT-5.2 Codex** (optional)

Each model receives optimized prompts tailored to its strengths.

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/dreamflow-command-dashboard.git
cd dreamflow-command-dashboard
npm install
```

### 2. Configure API Key

Create a `.env` file in the project root:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_ANTHROPIC_API_KEY=optional
VITE_OPENAI_API_KEY=optional
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

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
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 3: CODE DISSECTOR                            │
│                                                                      │
│  Audits the generated code for FF compatibility:                    │
│  • Scores 0-100 based on compliance                                  │
│  • Lists critical issues that block compilation                      │
│  • Provides before/after code transformations                        │
│  • Lists required user actions in FlutterFlow UI                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    READY TO PASTE                                    │
│           Copy directly into FlutterFlow Custom Code editor          │
└─────────────────────────────────────────────────────────────────────┘
```

### Example Prompts

**Custom Widget:**
> "Create a circular progress indicator with a gradient stroke and animated percentage text in the center. It should accept a `progress` value from 0-100 and an optional `onComplete` callback."

**Custom Action:**
> "Write an action that compresses an image using the flutter_image_compress package and returns the compressed file bytes as a Uint8List."

**Custom Function:**
> "Create a function that validates a credit card number using the Luhn algorithm and returns true/false."

---

## Understanding Imports in FlutterFlow

### Import Handling by Artifact Type

**FlutterFlow handles imports differently based on the artifact type:**

#### Custom Functions (Logic Silo)
- ❌ **NO external package imports allowed**
- ✅ Only dart SDK imports: `dart:math`, `dart:convert`, `dart:collection`
- Generated code will NOT include import statements
- Reason: Custom Functions run in a restricted sandbox

#### Custom Actions & Custom Widgets (Full Flutter Access)
- ✅ **Import statements ARE allowed and generated**
- ✅ Can use external packages from pub.dev
- Generated code WILL include necessary import statements
- Workflow: Add dependency to FlutterFlow → Import in code

**Example Custom Widget with imports:**

```dart
// ⬇️ FlutterFlow auto-provides these ⬇️
// DO NOT EDIT ABOVE THIS LINE
import 'package:flutter/material.dart';
import '/flutter_flow/flutter_flow_theme.dart';
// ⬆️ FlutterFlow auto-section ⬆️

// ⬇️ Your generated code with imports ⬇️
import 'package:google_fonts/google_fonts.dart';  // ✅ You add this!
import 'package:fl_chart/fl_chart.dart';          // ✅ And this!

class MyCustomWidget extends StatelessWidget {
  final double? width;
  final double? height;
  // ... your code ...
}
```

### The Correct Workflow

#### For Custom Actions & Custom Widgets

1. **Add Dependencies First** (if using external packages)
   - Navigate to: **FlutterFlow → Settings → Dependencies**
   - Click **Add Dependency**
   - Enter package name and version (e.g., `google_fonts: ^6.1.0`)
   - Wait for pub get to complete (30-60 seconds)

2. **Generate Code with Imports**
   - Use this tool to generate code
   - Generated code WILL include import statements
   - Example: `import 'package:google_fonts/google_fonts.dart';`

3. **Paste the Complete Generated Code**
   - Copy code from Step 2 (including import statements)
   - Paste into: **FlutterFlow → Custom Code → Custom Widget/Action**
   - The imports you add will work alongside FlutterFlow's auto-provided imports

#### For Custom Functions

1. **No External Dependencies Allowed**
   - Custom Functions cannot use external packages
   - Only dart SDK imports allowed (dart:math, dart:convert, dart:collection)

2. **Generate Code without Imports**
   - Generated code will NOT include import statements
   - Pure Dart logic only

3. **Paste the Code**
   - Copy and paste into: **FlutterFlow → Custom Code → Custom Function**

### What About Duplicate Imports?

**Don't worry about duplicating FlutterFlow's auto-imports!**

```dart
// ✅ This is fine - FlutterFlow handles duplicates gracefully
import 'package:flutter/material.dart';  // You add this
// FlutterFlow also provides this above, but no error occurs
```

FlutterFlow's auto-import section and your custom imports coexist without conflicts.

### Auto-Available Imports

These are **always** available in FlutterFlow custom code (no action needed):

- ✅ `flutter/material.dart` - Material widgets
- ✅ `flutter/widgets.dart` - Core widgets
- ✅ `flutter_flow/flutter_flow_theme.dart` - Theme system
- ✅ `flutter_flow/flutter_flow_util.dart` - Utility functions
- ✅ `dart:math` - Math operations
- ✅ `dart:async` - Future/Stream
- ✅ `dart:convert` - JSON encoding/decoding

### Need External Packages?

The **Code Dissector** (Step 3) will tell you exactly what to add:

```
## FlutterFlow Setup Instructions

### Step 1: Add Dependencies (MUST DO FIRST)
Navigate to: FlutterFlow → Settings → Dependencies → Add Dependency

Required packages:
- Package name: google_fonts
- Version: ^6.1.0
- Purpose: Custom font rendering
```

Follow these instructions **before** pasting the code!

---

## Tech Stack

- **Frontend:** Vanilla JavaScript + Tailwind CSS (via CDN)
- **Build Tool:** Vite 5.x
- **AI APIs:** Google Gemini (required), Anthropic Claude / OpenAI GPT (optional)
- **Syntax Highlighting:** Highlight.js with Dart language support
- **Fonts:** Inter (UI), JetBrains Mono (code)

---

## Project Structure

```
├── index.html      # UI structure, Tailwind styles, templates
├── app.js          # All application logic (single file)
├── vite.config.js  # Dev server, API proxies
├── package.json    # Project config & scripts
└── .env            # API keys (gitignored)
```

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Stop fighting FlutterFlow. Start building.</strong>
</p>

<p align="center">
  <a href="https://github.com/yourusername/dreamflow-command-dashboard/issues">Report Bug</a> •
  <a href="https://github.com/yourusername/dreamflow-command-dashboard/issues">Request Feature</a>
</p>
