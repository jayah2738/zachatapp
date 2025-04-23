"use client";
import { useEffect, useRef } from "react";

interface CallModalProps {
  open: boolean;
  type: "audio" | "video";
  onClose: () => void;
  calleeName: string;
}

export default function CallModal({ open, type, onClose, calleeName }: CallModalProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (open && type === "audio") {
      // Optionally play a ring sound
      audioRef.current?.play();
    }
  }, [open, type]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center gap-4 min-w-[280px]">
        <div className="flex items-center gap-2">
          {type === "video" ? (
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
              <rect width="14" height="10" x="3" y="7" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.05 5.05A7 7 0 015.05 15.05m4.24-1.414a3 3 0 004.242-4.242" />
              <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" fill="#dcfce7" />
            </svg>
          )}
          <span className="text-lg font-semibold text-gray-700">Calling {calleeName}...</span>
        </div>
        {type === "audio" && (
          <audio ref={audioRef} src="/ring.mp3" loop preload="auto" className="hidden" />
        )}
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 rounded-full bg-red-500 text-white font-semibold shadow hover:bg-red-600 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
