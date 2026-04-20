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
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-gray-200">
          Auto Cashout
        </label>
        <button
          onClick={handleToggle}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? "bg-green-600" : "bg-gray-600"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {isEnabled && (
        <>
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                disabled={disabled}
                min="1.01"
                max="100"
                step="0.1"
                className={`flex-1 bg-gray-700 border rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 ${
                  isValid
                    ? "border-gray-600 focus:ring-green-500"
                    : "border-red-500 focus:ring-red-500"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <span className="text-gray-400 text-sm">x</span>
            </div>
            {!isValid && inputValue && (
              <p className="text-xs text-red-400">
                Must be between 1.01 and 100
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1.5, 2.0, 3.0, 5.0].map((mult) => (
              <button
                key={mult}
                onClick={() => handleQuickSelect(mult)}
                disabled={disabled}
                className={`py-2 px-2 rounded text-xs font-semibold transition-colors ${
                  parseFloat(inputValue) === mult
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AutoCashout;
