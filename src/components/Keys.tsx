import { useState } from "react";

const layout = [
  [
    "Esc",
    "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","| |",
    "Del","light"
  ],
  [
    "~","1","2","3","4","5","6","7","8","9","0","-","+","Backspace","pgup"
  ],
  [
    "Tab","Q","W","E","R","T","Y","U","I","O","P","[","]","\\","pgdn"
  ],
  [
    "Caps","A","S","D","F","G","H","J","K","L",";","'","Enter","home"
  ],
  [
    "Shiftl","Z","X","C","V","B","N","M",",",".","/","Shiftr","Up","end"
  ],
  [
    "Ctrl","option","Cmd","Space","Cm","fn","alt","Left","Down","Right"
  ]
];

export default function Keys() {
  return (
    <div className="flex flex-col bg-white min-h-screen items-center justify-center">
      <div className="bg-black rounded-2xl border border-gray-600 p-2">
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
              <Key key={key + i} label={key} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Key({ label }: { label: string }) {
  const [pressed, setPressed] = useState(false);

  const islightBlueKey = (key: string) =>
    ["Tab","Caps","Shiftl","Shiftr","Ctrl","option","Cmd","Cm","fn","alt","F5","F6","F7","F8","F9","| |","Del","light","pgup","pgdn","home","end","Backspace"].includes(key);

  const isDarkBlueKey = (key: string) =>
    ["Esc","Enter","Up","Down","Left","Right"].includes(key);

  const getWidth = (key: string) => {
    if (key === "Space") return 305;
    if (key === "Backspace") return 100;
    if (key === "Tab") return 80;
    if (key === "\\") return 70;
    if (key === "Caps") return 100;
    if (key === "Enter") return 100;
    if (key === "Shiftl") return 130;
    if (key === "Shiftr") return 70;
    if (key === "Ctrl") return 65;
    if (key === "option") return 65;
    if (key === "Cmd") return 65;
    if (key === "Cm") return 50;
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

  return (
    <button
      type="button"
      aria-label={label}
      className="flex items-end cursor-pointer bg-transparent p-0"
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        height: "52px",
        width: `${width}px`,
      }}
    >
      {/* OUTER KEY */}
      <div
        className="relative overflow-hidden rounded-[4px] rounded-t-[12px] flex items-start justify-center"
        style={{
          width: `${width}px`,
          height: pressed ? "46px" : "52px",
          backgroundColor: outerBg,
          border: `1px solid ${borderColor}`,
          transition: "all 180ms ease",   // slower press
        }}
      >
        {/* KEYCAP */}
        <div
          className="relative z-10 h-[37px] rounded-[6px] text-[9px] font-medium flex flex-col items-center justify-between p-1 gap-0.5 select-none"
          style={{
            width:
              label === "Space"
                ? "96%"
                : ["Shiftl","Shiftr","Enter","Caps","Backspace","Tab"].includes(label)
                ? "90%"
                : "80%",

            backgroundColor: innerBg,
            color: innerText,

            // 👇 IMPORTANT FIX: NO TOP BORDER
            borderLeft: `1px solid ${borderColor}`,
            borderRight: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
            borderTop: "none",

            transform: pressed ? "translateY(2px)" : "translateY(0px)",
            transition: "all 180ms ease",
          }}
        >
          {label}
        </div>

        {/* RIGHT STICK */}
        <div
          className="absolute z-0 bottom-0 right-0 h-px w-8"
          style={{
            backgroundColor: isDarkBlueKey(label)
              ? "#1a2847"
              : islightBlueKey(label)
              ? "#60a5fa"
              : "#d1d5db",
            transform: pressed
              ? "translateX(14px) rotate(55deg)"
              : "translateX(14px) rotate(70deg)",
            transition: "all 180ms ease",
          }}
        />

        {/* LEFT STICK */}
        <div
          className="absolute z-0 bottom-0 left-0 h-px w-8"
          style={{
            backgroundColor: isDarkBlueKey(label)
              ? "#1a2847"
              : islightBlueKey(label)
              ? "#60a5fa"
              : "#d1d5db",
            transform: pressed
              ? "translateX(-14px) rotate(-55deg)"
              : "translateX(-14px) rotate(-70deg)",
            transition: "all 180ms ease",
          }}
        />
      </div>
    </button>
  );
}