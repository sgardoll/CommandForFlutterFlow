import { useCallback, useState } from "react";
import type { ElementType } from "react";
import {
  ArrowUp,
  ChevronDown,
  Command,
  Download,
  FileCode2,
  LogOut,
  Monitor,
  Plus,
  Search,
  Smartphone,
} from "lucide-react";

const designs = [
  ["FlowCode", "1h"],
  ["New Project", "7h"],
  ["New Project", "8h"],
  ["New Project", "8h"],
  ["Custom Code", "8h"],
  ["Hour Of Power Timer", "13h"],
  ["Read It", "4d"],
  ["Text Style Toggle", "4d"],
  ["Text Mode Switcher", "4d"],
  ["Five Step Flow", "5d"],
  ["NutriScan", "5d"],
  ["Star Quadrant", "5d"],
  ["FiveStep Onboarding", "6d"],
  ["Connect IO Showcase", "4/17"],
];

const suggestions = [
  "Professional Invoice Generator",
  "Client CRM for Agencies",
  "Rental Property Management App",
  "A stock tracking app inspired by Apple stocks app",
  "A travel booking app inspired by Airbnb",
  "Trip itinerary planner",
  "A music streaming app inspired by Spotify",
];

function DesignerLogo() {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.03em] text-zinc-100">
      <svg viewBox="0 0 28 28" className="h-5 w-5" fill="none">
        <path
          d="M5.5 6.5h17l-3.8 6.4 3.1 2.3-9.2 7.3 2.6-7.3H7.8L5.5 6.5Z"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M8.2 15.2 6.1 21.4l6.5 1.1M7.8 15.2l3.7-8.7M14.8 6.5l-2.2 16"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
      </svg>
      <span>designer_</span>
      <span className="rounded-[4px] bg-cyan-400/10 px-2 py-0.5 text-[9px] font-medium tracking-[0.12em] text-cyan-300/70">
        beta
      </span>
    </div>
  );
}

function SidebarAction({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <button className="group flex h-9 w-full items-center gap-3 rounded-md px-4 text-left text-[13px] text-zinc-400 transition-colors duration-150 hover:bg-zinc-800/45 hover:text-zinc-100">
      <Icon className="h-4 w-4 text-zinc-500 transition-colors duration-150 group-hover:text-zinc-300" />
      <span>{label}</span>
    </button>
  );
}

function DesignRow({ name, time }: { name: string; time: string }) {
  return (
    <button className="group flex h-8 w-full items-center justify-between gap-3 rounded-md px-4 text-left text-[13px] text-zinc-400 transition-colors duration-150 hover:bg-zinc-800/45 hover:text-zinc-100">
      <span className="flex min-w-0 items-center gap-3">
        <FileCode2 className="h-3.5 w-3.5 shrink-0 text-zinc-500 transition-colors duration-150 group-hover:text-zinc-300" />
        <span className="truncate">{name}</span>
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-zinc-600">{time}</span>
    </button>
  );
}

function PromptComposer({ onSubmit }: { onSubmit: () => void }) {
  const [prompt, setPrompt] = useState("");

  const submit = useCallback(() => {
    if (!prompt.trim()) return;
    onSubmit();
  }, [onSubmit, prompt]);

  return (
    <div className="w-full max-w-[750px]">
      <div className="mx-auto mb-2 grid h-[26px] max-w-[340px] grid-cols-2 overflow-hidden rounded-[8px] border border-zinc-800 bg-zinc-900/80 p-[2px] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <button className="rounded-[6px] bg-black text-[11px] font-medium text-zinc-100 shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
          Explore Styles
        </button>
        <button className="rounded-[6px] text-[11px] text-zinc-500 transition-colors duration-150 hover:text-zinc-300">
          Instant Generation
        </button>
      </div>

      <div className="relative rounded-[14px] border border-zinc-800 bg-[#080808] shadow-[0_18px_55px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.035)_inset]">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
          }}
          className="min-h-[112px] w-full resize-none rounded-[14px] bg-transparent px-5 py-5 pr-16 text-[14px] leading-6 text-zinc-200 caret-cyan-300 outline-none placeholder:text-zinc-600"
          placeholder="What kind of app do you want to design today?"
        />

        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <button className="designer-icon-button text-zinc-500 hover:text-zinc-200">
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex h-31px items-center rounded-[9px] bg-zinc-900 px-1 py-1 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
            <button className="flex h-7 w-8 items-center justify-center rounded-[7px] bg-black text-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.35)]">
              <Smartphone className="h-3.5 w-3.5" />
            </button>
            <button className="flex h-7 w-8 items-center justify-center rounded-[7px] text-zinc-500 transition-colors duration-150 hover:text-zinc-300">
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!prompt.trim()}
          className="absolute bottom-3 right-3 flex h-31px w-31px items-center justify-center rounded-[9px] bg-zinc-900 text-zinc-500 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] transition-colors duration-150 hover:text-zinc-200 active:scale-[0.96] disabled:opacity-50"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto mt-5 flex max-w-[700px] flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setPrompt(suggestion)}
            className="rounded-[8px] border border-zinc-800 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] text-zinc-400 shadow-[0_1px_0_rgba(255,255,255,0.025)_inset] transition-colors duration-150 hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="flex h-screen w-[277px] shrink-0 flex-col rounded-r-[12px] border border-l-0 border-zinc-800 bg-[#151515] shadow-[1px_0_0_rgba(255,255,255,0.02)_inset]">
      <div className="px-5 pt-5">
        <DesignerLogo />
      </div>

      <nav className="mt-7 space-y-3 px-1">
        <SidebarAction icon={Plus} label="New Design" />
        <button className="group flex h-9 w-full items-center justify-between rounded-md px-4 text-left text-[13px] text-zinc-400 transition-colors duration-150 hover:bg-zinc-800/45 hover:text-zinc-100">
          <span className="flex items-center gap-3">
            <Search className="h-4 w-4 text-zinc-500 transition-colors duration-150 group-hover:text-zinc-300" />
            Search
          </span>
          <span className="flex gap-1 text-[10px] text-zinc-600">
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1">⌘</kbd>
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1">K</kbd>
          </span>
        </button>
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between px-5 text-[11px] text-zinc-600">
          <span>My Designs</span>
          <ChevronDown className="h-3 w-3" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
          {designs.map(([name, time], index) => (
            <DesignRow key={`${name}-${time}-${index}`} name={name} time={time} />
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800 p-3">
        <div className="rounded-[9px] border border-zinc-800 bg-gradient-to-br from-zinc-900 to-[#111] p-3 shadow-[0_1px_0_rgba(255,255,255,0.035)_inset]">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-[4px] bg-cyan-400/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.08em] text-cyan-300/70">
              New Release
            </span>
            <button className="designer-icon-button rounded-[7px] bg-zinc-900 text-zinc-500 hover:text-zinc-200">
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
          <h3 className="text-[14px] font-semibold text-zinc-100">Designer Desktop App</h3>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">
            Available for macOS, featuring powerful bring-your-own agent features and integrations.
          </p>
          <button className="mt-4 flex h-8 w-full items-center justify-center gap-2 rounded-[7px] bg-zinc-800/80 text-[12px] text-zinc-400 transition-colors duration-150 hover:bg-zinc-700/70 hover:text-zinc-100 active:scale-[0.96]">
            ↗ Download
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-zinc-500 to-zinc-800 ring-1 ring-zinc-700" />
          <div>
            <div className="text-[12px] font-semibold text-zinc-100">Stuart Gardoll</div>
            <div className="mt-1 inline-flex rounded-[5px] bg-indigo-500/15 px-2 py-0.5 text-[10px] text-indigo-300/80">
              Designer
            </div>
          </div>
        </div>
        <button className="designer-icon-button text-zinc-500 hover:text-zinc-200">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

function App() {
  const [flash, setFlash] = useState(false);

  const handleSubmit = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 900);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#151515] text-zinc-200 antialiased">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden border-r border-zinc-700/70 bg-[#151515]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.018),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-zinc-900" />
        <div className={`relative z-10 w-full px-8 transition-transform duration-300 ${flash ? "scale-[1.01]" : "scale-100"}`}>
          <PromptComposer onSubmit={handleSubmit} />
        </div>
      </main>
    </div>
  );
}

export default App;
