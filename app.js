// --- CONFIGURATION ---
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || "";

// Model Configuration
const PROMPT_ARCHITECT_MODEL = "gemini-3-flash-preview";
const CODE_DISSECTOR_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODEL = "gemini-2.5-flash-preview-09-2025";

// --- APP STATE ---
let pipelineState = {
  step1Result: null,
  step2Result: null,
  step3Result: null,
  currentStep: 0,
  isRunning: false
};

// --- CORE API FUNCTIONS ---

async function checkConnection() {
  const statusText = document.getElementById("model-status-text");
  const statusLight = document.getElementById("model-status-light");

  if (!geminiApiKey) {
    statusText.innerText = "NO GEMINI API KEY";
    statusLight.className = "status-dot offline";
    console.error("Gemini API Key not found. Check .env file for VITE_GEMINI_API_KEY");
    return false;
  }

  statusText.innerText = `READY: ${PROMPT_ARCHITECT_MODEL}`;
  statusLight.className = "status-dot online";
  return true;
}

async function callGemini(prompt, systemInstruction, modelId = PROMPT_ARCHITECT_MODEL) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", response.status, errorText);
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini call failed:", error);
    if (modelId !== FALLBACK_MODEL) {
      console.log("Trying fallback model...");
      return callGemini(prompt, systemInstruction, FALLBACK_MODEL);
    }
    throw error;
  }
}

async function callClaude(prompt, systemInstruction) {
  if (!anthropicApiKey) {
    throw new Error("Anthropic API key not found");
  }

  const url = "https://api.anthropic.com/v1/messages";
  const payload = {
    model: "claude-4-5-opus-2024-10-22",
    max_tokens: 4000,
    system: systemInstruction,
    messages: [{ role: "user", content: prompt }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API Error:", response.status, errorText);
      throw new Error(`Claude API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text;
  } catch (error) {
    console.error("Claude call failed:", error);
    throw error;
  }
}

async function callOpenAI(prompt, systemInstruction) {
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not found");
  }

  const url = "https://api.openai.com/v1/chat/completions";
  const payload = {
    model: "gpt-5.2-codex",
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ],
    max_tokens: 4000,
    temperature: 0.1
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API Error:", response.status, errorText);
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content;
  } catch (error) {
    console.error("OpenAI call failed:", error);
    throw error;
  }
}

// --- PIPELINE FUNCTIONS ---

async function runPromptArchitect(userInput) {
  const systemInstruction = `You are a Senior FlutterFlow Architect. Analyze the user request and create a 'Master Prompt' that includes:
1. Strict null safety requirements
2. No external dependencies
3. Constructor parameter mapping
4. Stateless/Stateful wrapper structure
5. No main() function
6. Clear FlutterFlow integration points

Output ONLY the optimized prompt, no explanations.`;

  const prompt = `Create a master prompt for this FlutterFlow widget request: "${userInput}"`;
  
  try {
    const result = await callGemini(prompt, systemInstruction, PROMPT_ARCHITECT_MODEL);
    return result;
  } catch (error) {
    console.error("Prompt Architect failed:", error);
    throw error;
  }
}

async function runCodeGenerator(masterPrompt, selectedModel) {
  let result;
  
  const systemInstruction = `You are an expert Dart/Flutter developer specializing in FlutterFlow custom widgets.
Generate clean, production-ready Dart code that:
1. Follows strict null safety
2. Uses no external dependencies
3. Implements proper constructor parameter mapping
4. Wraps logic in StatelessWidget or StatefulWidget
5. Has no main() function
6. Is optimized for FlutterFlow integration

Output ONLY the complete Dart code, no explanations.`;

  try {
    switch (selectedModel) {
      case "claude-4.5-opus":
        result = await callClaude(masterPrompt, systemInstruction);
        break;
      case "gpt-5.2-codex":
        result = await callOpenAI(masterPrompt, systemInstruction);
        break;
      case "gemini-3.0-pro":
      default:
        result = await callGemini(masterPrompt, systemInstruction, "gemini-3.0-pro-preview");
        break;
    }
    return result;
  } catch (error) {
    console.error("Code Generator failed:", error);
    throw error;
  }
}

async function runCodeDissector(code) {
  const systemInstruction = `You are a ruthless Code Auditor. Check Dart code for:
1. 'void main()' presence (FAIL)
2. External imports (FAIL)
3. Null safety violations (WARN)
4. Constructor argument mismatches (WARN)
5. FlutterFlow integration issues (WARN)

Return a structured audit with:
- Critical issues that will cause compilation failure
- Warnings for potential runtime problems
- Recommendations for fixes

Be concise and actionable.`;

  const prompt = `Audit this Dart code for FlutterFlow integration:\n\n${code}`;
  
  try {
    const result = await callGemini(prompt, systemInstruction, CODE_DISSECTOR_MODEL);
    return result;
  } catch (error) {
    console.error("Code Dissector failed:", error);
    throw error;
  }
}

// --- UI FUNCTIONS ---

function updateStepIndicator(step, status) {
  const indicator = document.getElementById(`step${step}-indicator`);
  indicator.className = "step-indicator w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center";
  
  if (status === "active") {
    indicator.classList.add("active");
  } else if (status === "completed") {
    indicator.classList.add("completed");
  } else {
    indicator.classList.add("bg-gray-700");
  }
}

function showStepLoading(step, show) {
  const loading = document.getElementById(`step${step}-loading`);
  const result = document.getElementById(`step${step}-result`);
  
  if (show) {
    loading.classList.remove("hidden");
    result.classList.add("hidden");
    updateStepIndicator(step, "active");
  } else {
    loading.classList.add("hidden");
    result.classList.remove("hidden");
    updateStepIndicator(step, "completed");
  }
}

function toggleStep(step) {
  const content = document.getElementById(`${step}-content`);
  const toggle = document.getElementById(`${step}-toggle`);
  
  if (content.classList.contains("expanded")) {
    content.classList.remove("expanded");
    toggle.style.transform = "rotate(0deg)";
  } else {
    content.classList.add("expanded");
    toggle.style.transform = "rotate(180deg)";
  }
}

function updateModelInfo(selectedModel) {
  const modelInfo = document.getElementById("step2-model-info");
  const modelNames = {
    "gemini-3.0-pro": "Gemini 3.0 Pro",
    "claude-4.5-opus": "Claude 4.5 Opus",
    "gpt-5.2-codex": "GPT-5.2-Codex"
  };
  
  modelInfo.textContent = `Model: ${modelNames[selectedModel]} • Dart Code Generation`;
}

// --- MAIN PIPELINE ---

async function runThinkingPipeline() {
  if (pipelineState.isRunning) return;
  
  const userInput = document.getElementById("pipeline-input").value;
  if (!userInput.trim()) {
    alert("Please describe your FlutterFlow widget first.");
    return;
  }

  const selectedModel = document.getElementById("code-generator-model").value;
  const btn = document.getElementById("btn-run-pipeline");
  const btnText = document.getElementById("pipeline-btn-text");
  
  // Reset state
  pipelineState.isRunning = true;
  pipelineState.step1Result = null;
  pipelineState.step2Result = null;
  pipelineState.step3Result = null;
  
  btn.disabled = true;
  btnText.textContent = "Running Pipeline...";
  
  // Update model info
  updateModelInfo(selectedModel);
  
  try {
    // Step 1: Prompt Architect
    showStepLoading(1, true);
    toggleStep("step1");
    
    pipelineState.step1Result = await runPromptArchitect(userInput);
    
    document.getElementById("step1-output").textContent = pipelineState.step1Result;
    showStepLoading(1, false);
    
    // Step 2: Code Generator
    showStepLoading(2, true);
    toggleStep("step2");
    
    pipelineState.step2Result = await runCodeGenerator(pipelineState.step1Result, selectedModel);
    
    document.getElementById("step2-output").textContent = pipelineState.step2Result;
    showStepLoading(2, false);
    
    // Step 3: Code Dissector
    showStepLoading(3, true);
    toggleStep("step3");
    
    pipelineState.step3Result = await runCodeDissector(pipelineState.step2Result);
    
    // Format audit results
    const auditOutput = document.getElementById("step3-output");
    auditOutput.innerHTML = `
      <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <h4 class="text-red-400 font-bold text-xs uppercase mb-2">Audit Results</h4>
        <p class="text-sm text-gray-300 font-mono whitespace-pre-wrap">${pipelineState.step3Result}</p>
      </div>
    `;
    
    showStepLoading(3, false);
    
    // Show retry option if there were issues
    if (pipelineState.step3Result.toLowerCase().includes("fail") || 
        pipelineState.step3Result.toLowerCase().includes("error")) {
      document.getElementById("step2-retry").classList.remove("hidden");
    }
    
  } catch (error) {
    console.error("Pipeline failed:", error);
    
    // Show error on the current step
    const errorStep = pipelineState.currentStep || 1;
    const resultDiv = document.getElementById(`step${errorStep}-result`);
    const loadingDiv = document.getElementById(`step${errorStep}-loading`);
    
    loadingDiv.classList.add("hidden");
    resultDiv.classList.remove("hidden");
    
    const output = document.getElementById(`step${errorStep}-output`);
    if (output) {
      output.innerHTML = `<span class="text-red-400">Error: ${error.message}</span>`;
    }
    
    if (errorStep === 2) {
      document.getElementById("step2-retry").classList.remove("hidden");
    }
    
  } finally {
    pipelineState.isRunning = false;
    btn.disabled = false;
    btnText.textContent = "Run Pipeline";
  }
}

function retryWithDifferentModel() {
  // Show model selection dialog
  const currentModel = document.getElementById("code-generator-model").value;
  const otherModels = ["gemini-3.0-pro", "claude-4.5-opus", "gpt-5.2-codex"]
    .filter(model => model !== currentModel);
  
  const selectedModel = prompt(`Retry with different model?\n\nCurrent: ${currentModel}\n\nOptions:\n1. ${otherModels[0]}\n2. ${otherModels[1]}\n\nEnter 1 or 2:`);
  
  if (selectedModel === "1") {
    document.getElementById("code-generator-model").value = otherModels[0];
    runThinkingPipeline();
  } else if (selectedModel === "2") {
    document.getElementById("code-generator-model").value = otherModels[1];
    runThinkingPipeline();
  }
}

// --- INITIALIZATION ---

document.addEventListener("DOMContentLoaded", () => {
  checkConnection();
  
  // Auto-expand first step when results are ready
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && 
          mutation.attributeName === "class" &&
          mutation.target.classList.contains("hidden") === false) {
        // Step result is now visible, auto-expand
        const stepId = mutation.target.id.replace("-result", "");
        if (stepId.startsWith("step")) {
          setTimeout(() => toggleStep(stepId), 100);
        }
      }
    });
  });
  
  // Observe all result containers
  for (let i = 1; i <= 3; i++) {
    const resultDiv = document.getElementById(`step${i}-result`);
    if (resultDiv) {
      observer.observe(resultDiv, { attributes: true });
    }
  }
});

// Global exports
window.runThinkingPipeline = runThinkingPipeline;
window.toggleStep = toggleStep;
window.retryWithDifferentModel = retryWithDifferentModel;