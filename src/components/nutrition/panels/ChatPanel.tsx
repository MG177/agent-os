"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

const QUICK_ACTIONS = [
  { label: "Today's summary", text: "Give me my nutrition summary for today" },
  { label: "Log water", text: "Log 500ml water" },
  { label: "What can you do?", text: "What can you help me with?" },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: "0.9s",
          }}
        />
      ))}
    </div>
  );
}

function UserBubble({ msg }: { msg: Message }) {
  return (
    <div className="mb-3 flex justify-end">
      <div className="max-w-[80%] space-y-1">
        {msg.image && (
          <div className="flex justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={msg.image}
              alt="uploaded"
              className="max-h-48 rounded-2xl rounded-br-sm object-cover"
            />
          </div>
        )}
        {msg.content && (
          <div className="rounded-3xl rounded-br-lg bg-blue-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm shadow-blue-200">
            {msg.content}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantBubble({
  content,
  pending,
}: {
  content: string;
  pending?: boolean;
}) {
  return (
    <div className="mb-3 flex justify-start">
      <div className="flex max-w-[85%] items-end gap-2">
        <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs text-white">
          AI
        </div>
        <div className="rounded-3xl rounded-bl-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
          {pending ? (
            <TypingDots />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({ onMealLogged }: { onMealLogged?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  function compressImage(
    file: File,
  ): Promise<{ base64: string; preview: string }> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const preview = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = preview.split(",")[1];
        URL.revokeObjectURL(url);
        resolve({ base64, preview });
      };
      img.src = url;
    });
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, preview } = await compressImage(file);
    setImageBase64(base64);
    setImagePreview(preview);
    e.target.value = "";
  }

  function clearImage() {
    setImageBase64(null);
    setImagePreview(null);
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text && !imageBase64) return;
    if (streaming) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      image: imagePreview ?? undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    const capturedBase64 = imageBase64;
    clearImage();
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          image: capturedBase64
            ? { base64: capturedBase64, mediaType: "image/jpeg" }
            : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamingText(full);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: full }]);
      setStreamingText("");
      onMealLogged?.();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please try again.",
        },
      ]);
    }

    setStreaming(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0 && !streaming;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto py-2">
        {isEmpty && (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center pb-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-blue-500 text-xl font-bold text-white shadow-lg shadow-blue-200">
              AI
            </div>
            <h2 className="mb-1 text-base font-bold text-slate-800">
              Nutrition AI
            </h2>
            <p className="mb-5 max-w-xs text-xs leading-relaxed text-slate-400">
              Log food, send label photos, or ask about your progress.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map(({ label, text }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSend(text)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:bg-slate-50 hover:text-blue-600 active:scale-95"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <UserBubble key={i} msg={msg} />
          ) : (
            <AssistantBubble key={i} content={msg.content} />
          ),
        )}

        {streaming &&
          (streamingText ? (
            <AssistantBubble content={streamingText} />
          ) : (
            <AssistantBubble content="" pending />
          ))}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-slate-100 pt-3">
        {imagePreview && (
          <div className="mb-2 flex items-start gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="preview"
                className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">Image ready to send</p>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
            aria-label="Attach image"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5"
            >
              <rect x={3} y={3} width={18} height={18} rx={3} />
              <circle cx={8.5} cy={8.5} r={1.5} fill="currentColor" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
            capture="environment"
          />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Log food, ask a question…"
            disabled={streaming}
            className="flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={streaming || (!input.trim() && !imageBase64)}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-30 disabled:shadow-none"
            aria-label="Send message"
          >
            {streaming ? (
              <span className="text-xs">…</span>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
