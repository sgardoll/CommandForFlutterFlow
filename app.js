// --- CONFIGURATION ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
// 1. ATTEMPT 3.0 PRO (As requested)
const PRIMARY_MODEL = "gemini-3.0-pro-preview";
// 2. FALLBACK TO 2.5 FLASH (For Sandbox Compatibility)
const FALLBACK_MODEL = "gemini-2.5-flash-preview-09-2025";

// --- APP STATE ---
let currentView = "overview";
let charts = [];
let activeModel = "Checking...";

// --- CORE LOGIC ---

async function checkConnection() {
  const statusText = document.getElementById("model-status-text");
  const statusLight = document.getElementById("model-status-light");

  if (!apiKey) {
    statusText.innerText = "NO API KEY";
    statusLight.className = "status-dot offline";
    console.error("API Key not found. Check .env file for VITE_GEMINI_API_KEY");
    return;
  }

  statusText.innerText = `TARGET: ${PRIMARY_MODEL}`;
  statusLight.className = "status-dot fallback";
}

async function callGemini(prompt, systemInstruction) {
  const statusText = document.getElementById("model-status-text");
  const statusLight = document.getElementById("model-status-light");

  statusText.innerText = `CONNECTING: ${PRIMARY_MODEL}`;
  statusLight.className = "status-dot online thinking-pulse";

  try {
    let response = await fetchWithModel(
      PRIMARY_MODEL,
      prompt,
      systemInstruction
    );

    if (response.ok) {
      const data = await response.json();
      statusText.innerText = `ACTIVE: ${PRIMARY_MODEL}`;
      statusLight.className = "status-dot online";
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      const errorText = await response.text();
      console.error("Primary Model Error:", response.status, errorText);
      throw new Error("Primary Model Failed");
    }
  } catch (e) {
    console.warn(
      "Primary model failed or blocked by sandbox. Engaging Fallback Protocol."
    );
    console.error("Primary error details:", e);
    statusText.innerText = `FALLBACK: ${FALLBACK_MODEL}`;
    statusLight.className = "status-dot fallback";

    try {
      let response = await fetchWithModel(
        FALLBACK_MODEL,
        prompt,
        systemInstruction
      );
      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
      } else {
        const errorText = await response.text();
        console.error("Fallback Model Error:", response.status, errorText);
        throw new Error("Fallback Failed");
      }
    } catch (err) {
      console.error("Fallback error details:", err);
      statusText.innerText = "SYSTEM OFFLINE";
      statusLight.className = "status-dot offline";
      return `CRITICAL ERROR: Unable to establish reasoning link.\n\nCheck browser console for details (F12).\n\nCommon causes:\n- Missing API key in .env file\n- Invalid API key or no access to Gemini API\n- Model name incorrect or unavailable`;
    }
  }
}

async function fetchWithModel(modelId, prompt, sys) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: sys }] },
  };
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// --- FEATURE FUNCTIONS ---

async function runAiOptimizer() {
  const input = document.getElementById("ai-input-prompt").value;
  if (!input) return;

  const btn = document.getElementById("btn-run-optimizer");
  const res = document.getElementById("opt-res");
  const resText = document.getElementById("opt-res-text");

  btn.innerHTML = `<span class="animate-spin mr-2">⟳</span> Architecting...`;
  btn.disabled = true;

  const sys =
    "Act as Gemini 3 Pro. You are a Senior FlutterFlow Architect. Analyze the user request. Create a 'Master Prompt' that includes: 1. Strict null safety. 2. No external dependencies. 3. Constructor parameter mapping. 4. Stateless/Stateful wrapper. 5. No main(). Output ONLY the optimized prompt.";

  const output = await callGemini(input, sys);
  resText.textContent = output;
  res.classList.remove("hidden");
  btn.innerHTML = "Generate Master Prompt";
  btn.disabled = false;
}

async function runAiAuditor() {
  const input = document.getElementById("ai-input-code").value;
  if (!input) return;

  const btn = document.getElementById("btn-run-auditor");
  const res = document.getElementById("audit-res");

  btn.innerHTML = `<span class="animate-spin mr-2">⟳</span> Dissecting...`;
  btn.disabled = true;

  const sys =
    "Act as a ruthless Code Auditor. Check Dart code for: 1. 'void main()' (FAIL). 2. External imports (FAIL). 3. Null safety violations (WARN). 4. Constructor argument mismatches (WARN). Return a short, brutal summary of why this code will fail in FlutterFlow.";

  const output = await callGemini(`Audit this:\n${input}`, sys);

  res.innerHTML = `
    <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
      <h4 class="text-red-400 font-bold text-xs uppercase mb-2">Audit Log</h4>
      <p class="text-sm text-gray-300 font-mono whitespace-pre-wrap">${output}</p>
    </div>
  `;
  res.classList.remove("hidden");
  btn.innerHTML = "Run Integration Audit";
  btn.disabled = false;
}

// --- UI & CHART LOGIC ---

function switchView(viewId) {
  document.querySelectorAll(".nav-link").forEach((el) => el.classList.remove("active"));
  document.getElementById(`nav-${viewId}`).classList.add("active");

  const stage = document.getElementById("main-stage");
  const tpl = document.getElementById(`tpl-${viewId}`);
  stage.innerHTML = tpl.innerHTML;

  if (viewId === "overview") setTimeout(initCharts, 0);
}

function initCharts() {
  charts.forEach((c) => c.destroy());
  charts = [];

  const ctx1 = document.getElementById("chart-integrity").getContext("2d");
  charts.push(
    new Chart(ctx1, {
      type: "bar",
      data: {
        labels: ["Standard Gen", "G3 Architected"],
        datasets: [
          {
            label: "Build Success",
            data: [22, 98],
            backgroundColor: ["#3f3f46", "#6366f1"],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: "#27272a" }, ticks: { color: "#71717a" } },
          x: { grid: { display: false }, ticks: { color: "#a1a1aa" } },
        },
      },
    })
  );

  const ctx2 = document.getElementById("chart-bottlenecks").getContext("2d");
  charts.push(
    new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: ["Null Safety", "Dependencies", "Boilerplate"],
        datasets: [
          {
            data: [45, 35, 20],
            backgroundColor: ["#6366f1", "#a855f7", "#3f3f46"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#a1a1aa", font: { size: 10 } },
          },
        },
      },
    })
  );
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  checkConnection();
  switchView("overview");
});

window.switchView = switchView;
window.runAiOptimizer = runAiOptimizer;
window.runAiAuditor = runAiAuditor;
