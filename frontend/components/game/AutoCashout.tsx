"use client";

import React, { useState } from "react";

interface AutoCashoutProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

const AutoCashout: React.FC<AutoCashoutProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isEnabled, setIsEnabled] = useState(value !== null);
  const [inputValue, setInputValue] = useState(value?.toString() || "2.0");

  const handleToggle = () => {
    if (isEnabled) {
      setIsEnabled(false);
      onChange(null);
    } else {
      setIsEnabled(true);
      const multiplier = parseFloat(inputValue) || 2.0;
      onChange(multiplier);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (isEnabled) {
      const multiplier = parseFloat(val);
      if (!isNaN(multiplier) && multiplier >= 1.01 && multiplier <= 100) {
        onChange(multiplier);
      }
    }
  };

  const handleQuickSelect = (multiplier: number) => {
    setInputValue(multiplier.toString());
    setIsEnabled(true);
    onChange(multiplier);
  };

  const multiplier = parseFloat(inputValue);
  const isValid = !isNaN(multiplier) && multiplier >= 1.01 && multiplier <= 100;

  return (
    <div className={`rounded-lg p-2.5 sm:p-3 border transition-all duration-300 ${
      isEnabled 
        ? "bg-slate-800/80 border-emerald-500/30" 
        : "bg-slate-800/40 border-slate-700/50"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <label className={`text-xs font-bold font-orbitron tracking-wider transition-colors ${
          isEnabled ? "text-emerald-400" : "text-slate-400"
        }`}>
          AUTO CASHOUT
        </label>
        <button
          onClick={handleToggle}
          disabled={disabled}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 focus:outline-none ${
            isEnabled ? "bg-emerald-500" : "bg-slate-600"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
              isEnabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {isEnabled && (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <div className="mb-2">
            <div className="relative flex items-center bg-slate-900 border border-slate-600 rounded-md px-2 py-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                disabled={disabled}
                min="1.01"
                max="100"
                step="0.1"
                className={`w-full bg-transparent text-white text-base font-bold font-orbitron focus:outline-none ${
                  disabled ? "opacity-50 cursor-not-allowed" : ""
                } ${!isValid ? "text-red-400" : ""}`}
              />
              <span className={`font-bold font-orbitron text-xs select-none transition-colors ${
                isValid ? "text-emerald-500" : "text-red-500"
              }`}>
                X
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1.5, 2.0, 3.0, 5.0].map((mult) => (
              <button
                key={mult}
                onClick={() => handleQuickSelect(mult)}
                disabled={disabled}
                className={`py-1.5 px-1 rounded-md text-[10px] font-bold font-orbitron transition-all ${
                  parseFloat(inputValue) === mult
                    ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
                    : "bg-slate-900/50 border border-slate-700/50 text-slate-400 hover:bg-slate-800"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {mult}X
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoCashout;
