import React from "react";

const SIZE_MAP = {
  sm: { wrap: "w-10 h-10", logo: "w-6 h-6", text: "text-xs" },
  md: { wrap: "w-14 h-14", logo: "w-9 h-9", text: "text-sm" },
  lg: { wrap: "w-20 h-20", logo: "w-12 h-12", text: "text-base" },
};

const FameThinking = ({ label = "FAME is thinking", size = "md", className = "" }) => {
  const s = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative ${s.wrap} shrink-0`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 via-cyan-400 to-orange-400 opacity-70 animate-[fame-orbit_2.4s_linear_infinite]" />
        <div className="absolute inset-[2px] rounded-full bg-white/90 backdrop-blur-sm" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/fame-logo.png?v=2"
            alt="FAME"
            className={`${s.logo} object-contain animate-[fame-pulse_1.6s_ease-in-out_infinite] drop-shadow-sm`}
          />
        </div>
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-violet-500 animate-ping opacity-60" />
      </div>
      <div className={`${s.text} text-gray-500 font-medium`}>
        {label}
        <span className="inline-flex w-6">
          <span className="animate-[fame-dot_1.2s_ease-in-out_infinite]">.</span>
          <span className="animate-[fame-dot_1.2s_ease-in-out_0.2s_infinite]">.</span>
          <span className="animate-[fame-dot_1.2s_ease-in-out_0.4s_infinite]">.</span>
        </span>
      </div>
      <style>{`
        @keyframes fame-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fame-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.92; }
        }
        @keyframes fame-dot {
          0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
};

export default FameThinking;
