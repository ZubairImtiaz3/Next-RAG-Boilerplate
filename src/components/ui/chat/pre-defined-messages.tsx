"use client";

import { Button } from "@/components/ui/button";

export default function PreDefinedMessages({
  onMessageClick,
}: {
  onMessageClick: (msg: string) => void;
}) {
  const predefinedMessages = [
    "Tell me about Zubair Imtiaz",
    "What projects has he worked on?",
    "What is his tech stack?",
    "Can you show me some testimonials about him?",
    "What are his open-source contributions?",
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-4">
        {predefinedMessages.map((msg, index) => (
          <Button
            key={index}
            variant="outline"
            className="justify-start text-left h-auto py-2 px-4"
            onClick={() => onMessageClick(msg)}
          >
            {msg}
          </Button>
        ))}
      </div>
    </div>
  );
}
