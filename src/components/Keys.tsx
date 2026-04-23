import { useState, useEffect, useRef } from "react";

// ============================================
// Web Audio API — Zero-Latency Sound System
// ============================================
// KEY FIX: Buffer loading is AWAITED before any playback is allowed.
// A single `audioReadyPromise` gates all sound playback so there are
// zero race conditions and zero silent failures on first interaction.

let audioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;

// Promise-based gate: resolves when buffer is decoded and pipeline is warm.
// All playKeySound() calls await this before doing anything.
let audioReadyPromise: Promise<void> | null = null;
let resolveAudioReady: (() => void) | null = null;

// Track in-flight sources so we can cap concurrency and stop on keyup.
let activeSources: AudioBufferSourceNode[] = [];

const MAX_CONCURRENT = 6;

const STRONG_KEYS = new Set([" ", "return", "delete", "Shift ", "Shift", "Caps"]);

// ── 1. Create AudioContext once ──────────────────────────────────────────────
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
  }
  return audioCtx;
}

// ── 2. Build the ready-promise (idempotent) ───────────────────────────────────
// Called on the very first user interaction. Subsequent calls are no-ops.
async function initAudio(): Promise<void> {
  // Already initialising or done — return the same promise.
  if (audioReadyPromise) return audioReadyPromise;

  audioReadyPromise = new Promise<void>((resolve) => {
    resolveAudioReady = resolve;
  });

  const ctx = getAudioContext();

  // Resume a suspended context (browser autoplay policy).
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  // Decode the audio buffer.
  try {
    const response = await fetch("/sound/random.ogg");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } catch (e) {
    // Audio unavailable — resolve anyway so the UI still works silently.
    console.warn("[Keys] Audio load failed, running silently:", e);
    resolveAudioReady?.();
    return audioReadyPromise;
  }

  // Warm up the pipeline with a zero-gain silent buffer so the FIRST real
  // sound has no extra startup latency from the audio hardware.
  const warmup = ctx.createBuffer(1, 1, ctx.sampleRate);
  const warmupSrc = ctx.createBufferSource();
  warmupSrc.buffer = warmup;
  const warmupGain = ctx.createGain();
  warmupGain.gain.value = 0;
  warmupSrc.connect(warmupGain);
  warmupGain.connect(ctx.destination);
  warmupSrc.start();

  // Signal that we're ready.
  resolveAudioReady?.();
  return audioReadyPromise;
}

// ── 3. Playback ───────────────────────────────────────────────────────────────
// This is called synchronously from keydown/mousedown. The await only blocks
// on the VERY FIRST call (while the buffer is decoding). After that,
// audioReadyPromise is already resolved so the await is effectively instant.
async function playKeySound(label: string): Promise<void> {
  // Gate: ensure audio is initialised before touching anything.
  if (!audioReadyPromise) return; // initAudio() not called yet
  await audioReadyPromise;

  if (!audioCtx || !audioBuffer) return; // loaded but unavailable

  // Respect concurrency cap — stop oldest if we'd exceed it.
  if (activeSources.length >= MAX_CONCURRENT) {
    const oldest = activeSources.shift();
    try { oldest?.stop(); } catch (_) { /* already ended */ }
  }

  const isStrong = STRONG_KEYS.has(label);

  const source = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();

  source.buffer = audioBuffer;
  // Slight pitch variation for realism (±2.5%)
  source.playbackRate.value = 0.975 + Math.random() * 0.05;

  gain.gain.value = isStrong ? 0.75 : 0.5;

  source.connect(gain);
  gain.connect(audioCtx.destination);

  // Random start offset into the buffer for timbral variety.
  const maxOffset = Math.max(0, audioBuffer.duration - 0.07);
  const startOffset = Math.random() * Math.min(maxOffset, 0.35);
  const clipDuration = isStrong ? 0.065 : 0.045;

  source.start(audioCtx.currentTime, startOffset, clipDuration);
  activeSources.push(source);

  source.onended = () => {
    const i = activeSources.indexOf(source);
    if (i !== -1) activeSources.splice(i, 1);
  };
}

// ── 4. Stop all sounds (keyup) ────────────────────────────────────────────────
function stopAllSounds(): void {
  for (const src of activeSources) {
    try { src.stop(); } catch (_) { /* already ended */ }
  }
  activeSources = [];
}

// ── 5. Haptic feedback ────────────────────────────────────────────────────────
function triggerHaptic(label: string): void {
  if (!navigator.vibrate) return;
  try { navigator.vibrate(STRONG_KEYS.has(label) ? 15 : 5); } catch (_) { /**/ }
}

// ── Combined feedback entry-point ────────────────────────────────────────────
function triggerKeyFeedback(label: string): void {
  // Fire-and-forget. The first call will await init; subsequent calls return
  // from the already-resolved promise in microtask time (<< 1 ms).
  playKeySound(label);
  triggerHaptic(label);
}

// ============================================================
// Layout
// ============================================================
const layout = [
  ["esc","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","| |","Del","light"],
  ["~","1","2","3","4","5","6","7","8","9","0","-","+","delete","pgup"],
  ["Tab","Q","W","E","R","T","Y","U","I","O","P","[","]","\\","pgdn"],
  ["Caps","A","S","D","F","G","H","J","K","L",";","'","return","home"],
  ["Shift ","Z","X","C","V","B","N","M",",",".","/","Shift","Up","end"],
  ["fn","control","option","Cmd"," ","Cm","option ","Left","Down","Right"],
];

const shiftMap: Record<string, string> = {
  "`":"~","1":"!","2":"@","3":"#","4":"$","5":"%","6":"^","7":"&","8":"*",
  "9":"(","0":")","-":"_","+":"=","[":"{","]":"}","\\":"|",";":":","'":"\"",
  ",":"<",".":">","/":"?",
};

// ============================================================
// Icons
// ============================================================
function CommandIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 9a2 2 0 1 1 2 -2v10a2 2 0 1 1 -2 -2h10a2 2 0 1 1 -2 2v-10a2 2 0 1 1 2 2h-10" />
    </svg>
  );
}
function OptionIcon({ size = 12 }: { size?: number }) {
  return <span style={{ fontSize: size, lineHeight: 1 }}>⌥</span>;
}
function FnIcon({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" /><path d="M12 3v18" />
      <path d="M12 3C18 6 18 18 12 21C6 18 6 6 12 3" />
      <path d="M6 7.5c3 1.5 9 1.5 12 0" /><path d="M6 16.5c3 -1.5 9 -1.5 12 0" />
    </svg>
  );
}
function LeftIcon({ size = 12 }) { return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6l6 6" /></svg>; }
function RightIcon({ size = 12 }) { return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6l-6 6" /></svg>; }
function UpIcon({ size = 12 }) { return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6 -6l6 6" /></svg>; }
function DownIcon({ size = 12 }) { return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6l6 -6" /></svg>; }

// ============================================================
// Key mapping helpers (deduped)
// ============================================================
function mapKeyEventToLabel(e: KeyboardEvent): string {
  const key = e.key.toUpperCase();
  const code = e.code;
  const map: Record<string, string> = {
    " ": " ", ENTER: "return", TAB: "Tab", CAPSLOCK: "Caps",
    CONTROL: "control", ALT: "option", META: "Cmd",
    DELETE: "delete", BACKSPACE: "delete",
    PAGEUP: "pgup", PAGEDOWN: "pgdn", HOME: "home", END: "end",
    ESCAPE: "esc",
    "[": "[", "]": "]", "\\": "\\", ";": ";", "'": "'",
    ",": ",", ".": ".", "/": "/", "-": "-", "=": "+", "`": "~",
  };
  if (key === "SHIFT") return e.location === 1 ? "Shift" : "Shift ";
  if (code === "ArrowLeft")  return "Left";
  if (code === "ArrowRight") return "Right";
  if (code === "ArrowUp")    return "Up";
  if (code === "ArrowDown")  return "Down";
  if (map[key]) return map[key];
  if (/^[A-Z0-9]$/.test(key)) return key;
  if (/^F\d{1,2}$/.test(key)) return key;
  return "";
}

// ============================================================
// Main component
// ============================================================
export default function Keys() {
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const label = mapKeyEventToLabel(e);
      if (!label) return;

      // On FIRST keydown, initAudio() starts the async loading chain.
      // triggerKeyFeedback() then awaits the same promise — so sound plays
      // as soon as the buffer is decoded (instant on 2nd+ press).
      initAudio();
      triggerKeyFeedback(label);

      setPressedKeys((prev) => (prev.includes(label) ? prev : [...prev, label]));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const label = mapKeyEventToLabel(e);
      if (!label) return;
      stopAllSounds();
      setPressedKeys((prev) => prev.filter((k) => k !== label));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div className="flex flex-col bg-white min-h-screen items-center justify-center">
      <div className="p-2.5 bg-gray-600 rounded-2xl">
        <div className="bg-black rounded-2xl">
          {layout.map((row, i) => (
            <div
              key={i}
              className="flex justify-center flex-wrap"
              style={{ marginTop: i === 0 ? "-4px" : "-5px", opacity: 0.98 }}
            >
              {row.map((key) => (
                <Key key={key + i} label={key} isPressed={pressedKeys.includes(key)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Key component
// ============================================================
function Key({ label, isPressed }: { label: string; isPressed: boolean }) {
  const [mouseDown, setMouseDown] = useState(false);
  const isActive = mouseDown || isPressed;

  const getIcon = (key: string) => {
    if (key === "Cmd" || key === "Cm") return <CommandIcon size={12} />;
    if (key === "control") return <UpIcon size={12} />;
    if (key === "option" || key === "option ") return <OptionIcon size={12} />;
    if (key === "fn") return <FnIcon size={12} />;
    if (key === "Left") return <LeftIcon size={12} />;
    if (key === "Right") return <RightIcon size={12} />;
    if (key === "Up") return <UpIcon size={12} />;
    if (key === "Down") return <DownIcon size={12} />;
    return null;
  };

  const isIconKey = (key: string) =>
    ["Cmd","control","Cm","option","option ","fn","Left","Right","Up","Down"].includes(key);

  const isLightBlue = (key: string) =>
    ["Tab","Caps","Shift ","Shift","control","option","Cmd","Cm","fn","option ",
     "F5","F6","F7","F8","F9","| |","Del","light","pgup","pgdn","home","end","delete"].includes(key);

  const isDarkBlue = (key: string) =>
    ["esc","return","Up","Down","Left","Right"].includes(key);

  const getWidth = (key: string) => {
    const widths: Record<string, number> = {
      " ": 300, delete: 100, Tab: 80, "\\": 70, Caps: 100,
      return: 100, "Shift ": 130, Shift: 70, control: 65,
      option: 65, Cmd: 65, Cm: 55,
    };
    return widths[key] ?? (key.length === 1 ? 50 : 50);
  };

  const width = getWidth(label);

  const outerBg  = isDarkBlue(label) ? "#1e3a5f" : isLightBlue(label) ? "#93c5fd" : "#f2f2f2";
  const innerBg  = isDarkBlue(label) ? "#274c77" : isLightBlue(label) ? "#93c5fd" : "#ffffff";
  const innerText = isDarkBlue(label) ? "#dbeafe" : isLightBlue(label) ? "#1e40af" : "#374151";
  const borderColor = isDarkBlue(label) ? "#0c2d5c" : isLightBlue(label) ? "#60a5fa" : "#d1d5db";

  const shiftChar = label === "~" ? "~" : shiftMap[label];

  return (
    <button
      type="button"
      className="flex items-end bg-transparent p-0"
      onMouseDown={() => {
        initAudio();
        triggerKeyFeedback(label);
        setMouseDown(true);
      }}
      onMouseUp={() => setMouseDown(false)}
      onMouseLeave={() => setMouseDown(false)}
      style={{ height: "52px", width: `${width}px` }}
    >
      <div
        className="relative overflow-hidden rounded-[4px] rounded-t-[12px] flex items-start justify-center"
        style={{
          width: `${width}px`,
          height: isActive ? "46px" : "52px",
          backgroundColor: outerBg,
          border: `1px solid ${borderColor}`,
          transition: "all 180ms ease",
        }}
      >
        <div
          className="relative z-10 h-[37px] rounded-[6px] text-[9px] font-medium flex flex-col justify-between items-center p-1 select-none"
          style={{
            width: label === " "
              ? "96%"
              : ["Shift ","Shift","return","Caps","delete","Tab"].includes(label)
                ? "90%" : "80%",
            backgroundColor: innerBg,
            color: innerText,
            borderLeft: `1px solid ${borderColor}`,
            borderRight: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
            borderTop: "none",
            transform: isActive ? "translateY(2px)" : "translateY(0px)",
            transition: "all 180ms ease",
          }}
        >
          {shiftChar !== undefined && (
            <span className="text-[8px] opacity-70">{shiftChar}</span>
          )}
          <div className="flex flex-col gap-2 items-center justify-center leading-none">
            {isIconKey(label) && getIcon(label)}
            <span className="text-[7px] tracking-tight mt-[2px]">
              {label === "Cmd" || label === "Cm" ? "command" : label}
            </span>
          </div>
        </div>

        {/* Keycap sticks */}
        {(["left","right"] as const).map((side) => (
          <div key={side}
            className={`absolute bottom-0 ${side === "right" ? "right-0" : "left-0"} h-px w-8`}
            style={{
              backgroundColor: isDarkBlue(label) ? "#1a2847" : isLightBlue(label) ? "#60a5fa" : "#d1d5db",
              transform: isActive
                ? `translateX(${side === "right" ? "" : "-"}14px) rotate(${side === "right" ? "" : "-"}55deg)`
                : `translateX(${side === "right" ? "" : "-"}14px) rotate(${side === "right" ? "" : "-"}70deg)`,
              transition: "all 180ms ease",
            }}
          />
        ))}
      </div>
    </button>
  );
}