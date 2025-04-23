import React from 'react';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🙏', '🔥', '🎉', '😍'];

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="flex gap-2 p-2 bg-white rounded-xl shadow border w-max mx-auto">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          className="text-xl hover:scale-125 transition-transform"
          onClick={() => onSelect(emoji)}
          aria-label={emoji}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
