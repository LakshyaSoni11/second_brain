import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, id, className = "", ...rest }) => {
  const inputId = id || rest.name || label;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input-field ${error ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : ""} ${className}`}
        {...rest}
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
};