"use client";

import { useState, useEffect } from "react";


const SOUND_FILE = "/sounds/random.ogg";

let audioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let isAudioReady = false;

type Zone = { start: number; duration: number };

const ZONES = {
  space: [{ start: 8.0, duration: 0.5 }],
  rand:[{ start: 5, duration: 0.25 }],
  caps: [{ start: 32, duration: 0.25 }],
  shift: [{ start: 36.2, duration: 0.2 }],
  enterDelete: [{ start: 12.0, duration: 0.2 }],
  arrows: [{ start: 23.5, duration: 0.2 }],
  function: [{ start: 12.0, duration: 0.1 }],
  numbers: [{ start: 19, duration: 0.2 }, ],
  alphas: [

    { start: 26, duration: 0.2 },
  ],
};

function initAudioSystem() {
  if (typeof window === "undefined") return;
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  fetch(SOUND_FILE)
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) => audioCtx!.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      audioBuffer = buffer;
      isAudioReady = true;
    })
    .catch(() => { /* fail silently */ });
}

function unlockAudio() {
  if (audioCtx?.state === "suspended") audioCtx.resume();
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function playZone(zone: Zone, volume: number) {
  if (!audioCtx || !audioBuffer) return;
  try {
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    source.buffer = audioBuffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(0, zone.start, zone.duration);
  } catch (_e) { /* fail silently */ }
}

function playKeySound(label: string) {
  if (!isAudioReady) return;

  
  if (label === " ") {
    playZone(pickRandom(ZONES.space), 0.9);
    return;
  }

  if (label === "Caps" || label ==="esc") {
    playZone(pickRandom(ZONES.caps), 0.9);
    return;
  }

  if (label === "Shift " || label === "Shift") {
    playZone(pickRandom(ZONES.shift), 0.9);
    return;
  }

  if (label === "return" || label === "delete") {
    playZone(pickRandom(ZONES.enterDelete), 0.9);
    return;
  }

  if (label === "Left" || label === "Right" || label === "Up" || label === "Down") {
    playZone(pickRandom(ZONES.arrows), 0.9);
    return;
  }

  if (/^F([1-9]|1[0-2])$/.test(label)) {
    playZone(pickRandom(ZONES.function), 0.9);
    return;
  }

  if (/^\d$/.test(label)) {
    playZone(pickRandom(ZONES.numbers), 0.75);
    return;
  }

  if (/^[A-Z]$/.test(label)) {
    playZone(pickRandom(ZONES.alphas), 1);
    return;
  }
  playZone(pickRandom(ZONES.rand), 0.5);
}

const STRONG_LABELS = new Set([" ", "return", "delete", "Shift", "Shift "]);

function triggerHaptic(label: string) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(STRONG_LABELS.has(label) ? 15 : 5);
  } catch (_e) { /* fail silently */ }
}

function triggerKeyFeedback(label: string) {
  unlockAudio();
  playKeySound(label);
  triggerHaptic(label);
}


const layout = [
  [
    "esc",
    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "| |",
    "Del", "light"
  ],
  [
    "~", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "+", "delete", "pgup"
  ],
  [
    "Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "pgdn"
  ],
  [
    "Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "return", "home"
  ],
  [
    "Shift ", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Shift", "Up", "end"
  ],
  [
    "fn", "control", "option", "Cmd", " ", "Cm", "option ", "Left", "Down", "Right"
  ]
];

const shiftMap: Record<string, string> = {
  "`": "~",
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
  "-": "_",
  "+": "=",
  "[": "{",
  "]": "}",
  "\\": "|",
  ";": ":",
  "'": "\"",
  ",": "<",
  ".": ">",
  "/": "?"
};

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
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3v18" />
      <path d="M12 3C18 6 18 18 12 21C6 18 6 6 12 3" />
      <path d="M6 7.5c3 1.5 9 1.5 12 0" />
      <path d="M6 16.5c3 -1.5 9 -1.5 12 0" />
    </svg>
  );
}

function LeftIcon({ size = 12 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6l6 6" />
    </svg>
  );
}

function RightIcon({ size = 12 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6l-6 6" />
    </svg>
  );
}

function UpIcon({ size = 12 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 15l6 -6l6 6" />
    </svg>
  );
}

function DownIcon({ size = 12 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6l6 -6" />
    </svg>
  );
}

export default function Keys() {
  
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);

  useEffect(() => {
    initAudioSystem();
  }, []);

  useEffect(() => {

    const toDisplayKey = (e: KeyboardEvent): string => {
      const key = e.key.toUpperCase();
      const code = e.code;
      if (key === " ") return " ";
      if (key === "ENTER") return "return";
      if (key === "TAB") return "Tab";
      if (key === "CAPSLOCK") return "Caps";
      if (key === "SHIFT") return e.location === 2 ? "Shift" : "Shift ";
      if (key === "CONTROL") return "control";
      if (key === "ALT") return "option";
      if (key === "META") return "Cmd";
      if (code === "ArrowLeft") return "Left";
      if (code === "ArrowRight") return "Right";
      if (code === "ArrowUp") return "Up";
      if (code === "ArrowDown") return "Down";
      if (key === "BACKSPACE" || key === "DELETE") return "delete";
      if (key === "PAGEUP") return "pgup";
      if (key === "PAGEDOWN") return "pgdn";
      if (key === "HOME") return "home";
      if (key === "END") return "end";
      if (key === "ESCAPE") return "esc";
      if (key === "=") return "+";
      if (key === "`") return "~";
      if (key.match(/^[A-Z0-9]$/)) return key;
      if (key.match(/^F\d{1,2}$/)) return key;
      if (key.length === 1) return key;  
      return "";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
       if (e.key === "Tab") {
    e.preventDefault();
  }
     if (e.key === "Caps") {
    e.preventDefault();
  }

      const displayKey = toDisplayKey(e);
      if (!displayKey) return;
      triggerKeyFeedback(displayKey);
      setPressedKeys((prev) =>
        prev.includes(displayKey) ? prev : [...prev, displayKey]
      );
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const displayKey = toDisplayKey(e);
      if (displayKey) {
        setPressedKeys((prev) => prev.filter((k) => k !== displayKey));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []); // ← empty: listeners registered exactly once

  return (
    <div className="flex flex-col bg-white min-h-screen items-center justify-center">
      <div className="p-2.5 bg-gray-600 rounded-2xl">
        <div className="bg-black rounded-2xl">
          {layout.map((row, i) => (
            <div
              key={i}
              className="flex justify-center flex-wrap"
              style={{
                marginTop: i === 0 ? "-4px" : "-5px",
                opacity: 0.98,
              }}
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
function Key({ label, isPressed }: { label: string; isPressed: boolean }) {
  const [pressed, setPressed] = useState(false);

  const isActive = pressed || isPressed;

  const getIcon = (key: string) => {
    if (key === "Cmd") return <CommandIcon size={12} />;
    if (key === "Cm") return <CommandIcon size={12} />;
    if (key === "control") return <UpIcon size={12} />;
    if (key === "option") return <OptionIcon size={12} />;
    if (key === "option ") return <OptionIcon size={12} />;
    if (key === "fn") return <FnIcon size={12} />;
    if (key === "Left") return <LeftIcon size={12} />;
    if (key === "Right") return <RightIcon size={12} />;
    if (key === "Up") return <UpIcon size={12} />;
    if (key === "Down") return <DownIcon size={12} />;
    return null;
  };

  const isIconKey = (key: string) =>
    ["Cmd", "control", "Cm", "option", "option ", "fn", "Left", "Right", "Up", "Down"].includes(key);

  const islightBlueKey = (key: string) =>
    ["Tab", "Caps", "Shift ", "Shift", "control", "option", "Cmd", "Cm", "fn", "option ", "F5", "F6", "F7", "F8", "F9", "| |", "Del", "light", "pgup", "pgdn", "home", "end", "delete"].includes(key);

  const isDarkBlueKey = (key: string) =>
    ["esc", "return", "Up", "Down", "Left", "Right"].includes(key);

  const getWidth = (key: string) => {
    if (key === " ") return 300;
    if (key === "delete") return 100;
    if (key === "Tab") return 80;
    if (key === "\\") return 70;
    if (key === "Caps") return 100;
    if (key === "return") return 100;
    if (key === "Shift ") return 130;
    if (key === "Shift") return 70;
    if (key === "control") return 65;
    if (key === "option") return 65;
    if (key === "Cmd") return 65;
    if (key === "Cm") return 55;
    if (key.length === 1) return 50;
    return 50;
  };

  const width = getWidth(label);

  const outerBg = isDarkBlueKey(label)
    ? "#1e3a5f"
    : islightBlueKey(label)
      ? "#93c5fd"
      : "#f2f2f2";

  const innerBg = isDarkBlueKey(label)
    ? "#274c77"
    : islightBlueKey(label)
      ? "#93c5fd"
      : "#ffffff";

  const innerText = isDarkBlueKey(label)
    ? "#dbeafe"
    : islightBlueKey(label)
      ? "#1e40af"
      : "#374151";

  const borderColor = isDarkBlueKey(label)
    ? "#0c2d5c"
    : islightBlueKey(label)
      ? "#60a5fa"
      : "#d1d5db";

  const shiftChar = label === "~" ? "~" : shiftMap[label];

  return (
    <button
      type="button"
      className="flex items-end bg-transparent p-0"
      onMouseDown={() => {
        triggerKeyFeedback(label);
        setPressed(true);
      }}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        height: "52px",
        width: `${width}px`,
      }}
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
            width:
              label === " "
                ? "96%"
                : ["Shift ", "Shift", "return", "Caps", "delete", "Tab"].includes(label)
                  ? "90%"
                  : "80%",
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

        <div
          className="absolute bottom-0 right-0 h-px w-8"
          style={{
            backgroundColor: isDarkBlueKey(label)
              ? "#1a2847"
              : islightBlueKey(label)
                ? "#60a5fa"
                : "#d1d5db",
            transform: isActive
              ? "translateX(14px) rotate(55deg)"
              : "translateX(14px) rotate(70deg)",
            transition: "all 180ms ease",
          }}
        />
        <div
          className="absolute bottom-0 left-0 h-px w-8"
          style={{
            backgroundColor: isDarkBlueKey(label)
              ? "#1a2847"
              : islightBlueKey(label)
                ? "#60a5fa"
                : "#d1d5db",
            transform: isActive
              ? "translateX(-14px) rotate(-55deg)"
              : "translateX(-14px) rotate(-70deg)",
            transition: "all 180ms ease",
          }}
        />
      </div>
    </button>
  );
}