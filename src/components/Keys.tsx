"use client";

import { useState, useEffect, useRef } from "react";

// ============================================
// Web Audio API Buffer System - Keyb-Style
// Uses /sounds/random.ogg (39 seconds sprite)
// Preload and decode ONCE on mount
// Each keypress creates new AudioBufferSourceNode
// NO HTMLAudioElement, NO currentTime seeking
// ============================================

const SOUND_FILE = "/sounds/random.ogg";

// Web Audio API globals
let audioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let isAudioReady = false;

const STRONG_KEYS = [" ", "return", "delete", "Shift ", "Shift", "Caps"];

// Key-to-timestamp mapping (each key has a unique position in the 39s audio sprite)
const keyTimeMap: Record<string, number> = {
  // Row 1 - Function keys
  "esc": 0.0,
  "F1": 0.5,
  "F2": 1.0,
  "F3": 1.5,
  "F4": 2.0,
  "F5": 2.5,
  "F6": 3.0,
  "F7": 3.5,
  "F8": 4.0,
  "F9": 4.5,
  "F10": 5.0,
  "F11": 5.5,
  "F12": 6.0,
  "| |": 6.5,
  "Del": 7.0,
  "light": 7.5,
  
  // Row 2 - Numbers
  "~": 8.0,
  "1": 8.5,
  "2": 9.0,
  "3": 9.5,
  "4": 10.0,
  "5": 10.5,
  "6": 11.0,
  "7": 11.5,
  "8": 12.0,
  "9": 12.5,
  "0": 13.0,
  "-": 13.5,
  "+": 14.0,
  "delete": 14.5,
  "pgup": 15.0,
  
  // Row 3 - QWERTY top
  "Tab": 15.5,
  "Q": 16.0,
  "W": 16.5,
  "E": 17.0,
  "R": 17.5,
  "T": 18.0,
  "Y": 18.5,
  "U": 19.0,
  "I": 19.5,
  "O": 20.0,
  "P": 20.5,
  "[": 21.0,
  "]": 21.5,
  "\\": 22.0,
  "pgdn": 22.5,
  
  // Row 4 - Home row
  "Caps": 23.0,
  "A": 23.5,
  "S": 24.0,
  "D": 24.5,
  "F": 25.0,
  "G": 25.5,
  "H": 26.0,
  "J": 26.5,
  "K": 27.0,
  "L": 27.5,
  ";": 28.0,
  "'": 28.5,
  "return": 29.0,
  "home": 29.5,
  
  // Row 5 - Bottom letters
  "Shift ": 30.0,
  "Z": 30.5,
  "X": 31.0,
  "C": 31.5,
  "V": 32.0,
  "B": 32.5,
  "N": 33.0,
  "M": 33.5,
  ",": 34.0,
  ".": 34.5,
  "/": 35.0,
  "Shift": 35.5,
  "Up": 36.0,
  "end": 36.5,
  
  // Row 6 - Modifiers
  "fn": 37.0,
  "control": 37.2,
  "option": 37.4,
  "Cmd": 37.6,
  " ": 37.8, // Space bar
  "Cm": 38.0,
  "option ": 38.2,
  "Left": 38.4,
  "Down": 38.6,
  "Right": 38.8,
};

// Sound duration per key (in seconds for Web Audio)
const SOUND_DURATION = 0.08; // 80ms
const STRONG_SOUND_DURATION = 0.12; // 120ms

// Initialize Web Audio and decode buffer ONCE on mount
function initAudioSystem() {
  if (typeof window === "undefined") return;
  if (audioCtx) return; // Already initialized
  
  // Create AudioContext
  audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  
  // Fetch and decode audio ONCE
  fetch(SOUND_FILE)
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) => {
      if (audioCtx) {
        return audioCtx.decodeAudioData(arrayBuffer);
      }
    })
    .then((buffer) => {
      if (buffer) {
        audioBuffer = buffer;
        isAudioReady = true;
      }
    })
    .catch(() => {
      // Fail silently
    });
}

// Resume AudioContext on first user interaction (browser autoplay policy)
function unlockAudio() {
  if (!audioCtx) return;
  
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

// Play key sound - create new AudioBufferSourceNode for each keypress
// FULLY SYNCHRONOUS, no async, no currentTime seeking
function playKeySound(label: string) {
  if (!audioCtx || !audioBuffer || !isAudioReady) return;
  
  const timestamp = keyTimeMap[label];
  if (timestamp === undefined) return;
  
  const isStrongKey = STRONG_KEYS.includes(label);
  const duration = isStrongKey ? STRONG_SOUND_DURATION : SOUND_DURATION;
  const volume = isStrongKey ? 0.7 : 0.5;
  
  try {
    // Create NEW source node for this keypress (independent, no sharing)
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    
    // Set decoded buffer
    source.buffer = audioBuffer;
    
    // Set volume
    gainNode.gain.value = volume;
    
    // Connect: source -> gain -> destination
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Convert timestamp to buffer offset (samples)
    // Play from offset for specified duration
    // source.start(when, offset, duration)
    source.start(0, timestamp, duration);
  } catch (e) {
    // Fail silently
  }
}

// Helper function for haptic feedback
function triggerHaptic(label: string) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  
  const isStrongKey = STRONG_KEYS.includes(label);
  
  try {
    navigator.vibrate(isStrongKey ? 15 : 5);
  } catch (e) {
    // Fail silently
  }
}

// Combined feedback function - SYNCHRONOUS
function triggerKeyFeedback(label: string) {
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

// SHIFT CHAR MAP
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

// ICONS
function CommandIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 9a2 2 0 1 1 2 -2v10a2 2 0 1 1 -2 -2h10a2 2 0 1 1 -2 2v-10a2 2 0 1 1 2 2h-10" />
    </svg>
  );
}

function OptionIcon({ size = 12 }: { size?: number }) {
  return (
    <span style={{ fontSize: size, lineHeight: 1 }}>⌥</span>
  );
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
      {/* outer circle */}
      <circle cx="12" cy="12" r="9" />

      {/* horizontal */}
      <path d="M3 12h18" />

      {/* straight vertical */}
      <path d="M12 3v18" />

      {/* ✅ strong oval vertical curve */}
      <path d="M12 3C18 6 18 18 12 21C6 18 6 6 12 3" />

      {/* top */}
      <path d="M6 7.5c3 1.5 9 1.5 12 0" />

      {/* bottom */}
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

  // Initialize Web Audio and decode buffer ONCE on mount
  useEffect(() => {
    initAudioSystem();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent key repeat spam when holding key
      if (e.repeat) return;
      
      const key = e.key.toUpperCase();
      const code = e.code;

      // Map keyboard codes to display labels
      let displayKey = "";
      
      if (key === " ") displayKey = " ";
      else if (key === "ENTER") displayKey = "return";
      else if (key === "TAB") displayKey = "Tab";
      else if (key === "CAPSLOCK") displayKey = "Caps";
      else if (key === "SHIFT") displayKey = e.location === 1 ? "Shift" : "Shift ";
      else if (key === "CONTROL") displayKey = "control";
      else if (key === "ALT") displayKey = "option";
      else if (key === "META") displayKey = "Cmd";
      else if (code === "ArrowLeft") displayKey = "Left";
      else if (code === "ArrowRight") displayKey = "Right";
      else if (code === "ArrowUp") displayKey = "Up";
      else if (code === "ArrowDown") displayKey = "Down";
      else if (key === "DELETE") displayKey = "delete";
      else if (key === "BACKSPACE") displayKey = "delete";
      else if (key === "PAGEUP") displayKey = "pgup";
      else if (key === "PAGEDOWN") displayKey = "pgdn";
      else if (key === "HOME") displayKey = "home";
      else if (key === "END") displayKey = "end";
      else if (key === "ESCAPE") displayKey = "esc";
      else if (key === "[") displayKey = "[";
      else if (key === "]") displayKey = "]";
      else if (key === "\\") displayKey = "\\";
      else if (key === ";") displayKey = ";";
      else if (key === "'") displayKey = "'";
      else if (key === ",") displayKey = ",";
      else if (key === ".") displayKey = ".";
      else if (key === "/") displayKey = "/";
      else if (key === "-") displayKey = "-";
      else if (key === "=") displayKey = "+";
      else if (key === "`") displayKey = "~";
      else if (key.match(/^[A-Z0-9]$/)) displayKey = key;
      else if (key.match(/^F\d{1,2}$/)) displayKey = key;

      if (displayKey && !pressedKeys.includes(displayKey)) {
        unlockAudio(); // Resume AudioContext on first interaction
        triggerKeyFeedback(displayKey);
        setPressedKeys((prev) => [...prev, displayKey]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const code = e.code;

      let displayKey = "";
      
      if (key === " ") displayKey = " ";
      else if (key === "ENTER") displayKey = "return";
      else if (key === "TAB") displayKey = "Tab";
      else if (key === "CAPSLOCK") displayKey = "Caps";
      else if (key === "SHIFT") displayKey = e.location === 1 ? "Shift" : "Shift ";
      else if (key === "CONTROL") displayKey = "control";
      else if (key === "ALT") displayKey = "option";
      else if (key === "META") displayKey = "Cmd";
      else if (code === "ArrowLeft") displayKey = "Left";
      else if (code === "ArrowRight") displayKey = "Right";
      else if (code === "ArrowUp") displayKey = "Up";
      else if (code === "ArrowDown") displayKey = "Down";
      else if (key === "DELETE") displayKey = "delete";
      else if (key === "BACKSPACE") displayKey = "delete";
      else if (key === "PAGEUP") displayKey = "pgup";
      else if (key === "PAGEDOWN") displayKey = "pgdn";
      else if (key === "HOME") displayKey = "home";
      else if (key === "END") displayKey = "end";
      else if (key === "ESCAPE") displayKey = "esc";
      else if (key === "[") displayKey = "[";
      else if (key === "]") displayKey = "]";
      else if (key === "\\") displayKey = "\\";
      else if (key === ";") displayKey = ";";
      else if (key === "'") displayKey = "'";
      else if (key === ",") displayKey = ",";
      else if (key === ".") displayKey = ".";
      else if (key === "/") displayKey = "/";
      else if (key === "-") displayKey = "-";
      else if (key === "=") displayKey = "+";
      else if (key === "`") displayKey = "~";
      else if (key.match(/^[A-Z0-9]$/)) displayKey = key;
      else if (key.match(/^F\d{1,2}$/)) displayKey = key;

      if (displayKey) {
        // Overlapping sounds allowed - no stopping
        setPressedKeys((prev) => prev.filter((k) => k !== displayKey));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pressedKeys]);

  return (
    <div className="flex flex-col bg-white min-h-screen items-center justify-center">
      <div className="p-2.5 bg-gray-600 rounded-2xl ">
      <div className="bg-black rounded-2xl ">
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
  
  // Combine both click and keyboard press state
  const isActive = pressed || isPressed;

  // ✅ restored icon logic
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
    ["Cmd","control", "Cm", "option","option ", "fn", "Left", "Right", "Up", "Down"].includes(key);

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
        // unlockAudioPool(); // Unlock on first interaction
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
        {/* KEYCAP */}
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
            <span className="text-[8px] opacity-70">
              {shiftChar}
            </span>
          )}
          <div className="flex flex-col gap-2 items-center justify-center leading-none">
            {/* ICON */}
            {isIconKey(label) && getIcon(label)}

            {/* TEXT BELOW */}
            <span className="text-[7px] tracking-tight mt-[2px]">
              {label === "Cmd" || label === "Cm"
                ? "command"
                : label}
            </span>
          </div>
          {/* shift char (top only for symbols) */}

        </div>

        {/* STICKS */}
        <div className="absolute bottom-0 right-0 h-px w-8"
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

        <div className="absolute bottom-0 left-0 h-px w-8"
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
