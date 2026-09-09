import React from "react";
import { Github } from "lucide-react";

const GoogleIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 5.04c1.72 0 3.28.61 4.5 1.8l3.36-3.36C17.9 1.47 15.13.38 12 .38 7.5.38 3.54 3.06 1.72 6.9L5.6 9.9c.96-2.8 3.62-4.86 6.4-4.86Z" />
    <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.61-.21-2.37H12v4.51h6.49c-.28 1.48-1.11 2.73-2.37 3.58l3.75 2.91c2.19-2.02 3.62-5 3.62-8.63Z" />
    <path fill="#FBBC05" d="M5.6 14.1a6.9 6.9 0 0 1 0-4.2L1.72 6.9A11.92 11.92 0 0 0 .38 12c0 1.77.36 3.46 1 5.01l4.22-2.91Z" />
    <path fill="#34A853" d="M12 23.62c3.24 0 5.95-1.07 7.93-2.9l-3.75-2.91c-1.03.7-2.36 1.12-4.18 1.12-2.78 0-5.44-2.06-6.4-4.86l-3.88 3c1.82 3.84 5.77 6.55 10.28 6.55Z" />
  </svg>
);

const oauthBase = `${import.meta.env.VITE_API_URL}/auth`;

export const OAuthButtons: React.FC<{ mode: "signin" | "signup" }> = ({ mode }) => {
  return (
    <div className="space-y-2.5">
      <a
        href={`${oauthBase}/google`}
        className="flex w-full items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl glass border-white/20 text-sm font-medium text-gray-200 hover:bg-white/10 transition-all"
      >
        <GoogleIcon />
        Continue with Google
      </a>
      <a
        href={`${oauthBase}/github`}
        className="flex w-full items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/95 text-sm font-medium text-gray-900 hover:bg-white transition-all"
      >
        <Github size={16} />
        Continue with GitHub
      </a>
      <div className="flex items-center gap-3 my-1">
        <span className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-gray-500">{mode === "signup" ? "or sign up with email" : "or sign in with email"}</span>
        <span className="flex-1 h-px bg-white/10" />
      </div>
    </div>
  );
};