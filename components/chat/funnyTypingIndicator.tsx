// FunnyTypingIndicator.tsx
"use client";

import { useEffect, useState } from "react";

// Props for who is typing (optional)
interface FunnyTypingIndicatorProps {
  username?: string;
  emojis?: string[];
  interval?: number; // ms between emoji changes
}

export function FunnyTypingIndicator({
  username,
  emojis = ["✍️", "🤔", "💬", "🐱", "🤖"],
  interval = 500,
}: FunnyTypingIndicatorProps) {
  const [emojiIndex, setEmojiIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setEmojiIndex((prev) => (prev + 1) % emojis.length);
    }, interval);

    return () => clearInterval(timer);
  }, [emojis, interval]);

  return (
    <div className="funny-typing-indicator">
      <span className="typing-username">{username}</span>
      <span className="typing-emoji">{emojis[emojiIndex]}</span>
    </div>
  );
}
