"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Send, X } from "lucide-react";
import {
  filterSlashCommands,
  getSlashCommandDefinition,
  type AssistantSlashCommandId,
} from "@/lib/assistant/commands";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

const QUICK_ACTIONS = [
  {
    label: "Today's summary",
    text: "Give me my nutrition summary for today",
    command: "nutrition-summary" as AssistantSlashCommandId,
  },
  {
    label: "Today's schedule",
    text: "What's on my calendar today?",
    command: "list-events" as AssistantSlashCommandId,
  },
  {
    label: "Capture note",
    text: "Capture: follow up on vault assistant plan",
    command: "capture" as AssistantSlashCommandId,
  },
  {
    label: "What can you do?",
    text: "What can you help me with?",
    command: "general" as AssistantSlashCommandId,
  },
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

export default function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [activeCommand, setActiveCommand] =
    useState<AssistantSlashCommandId | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashHighlight, setSlashHighlight] = useState(0);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const slashQuery =
    input.startsWith("/") && !activeCommand ? input.slice(1) : "";
  const slashSuggestions = slashMenuOpen
    ? filterSlashCommands(slashQuery)
    : [];

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  useEffect(() => {
    setSlashHighlight(0);
  }, [slashQuery]);

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

  function selectSlashCommand(id: AssistantSlashCommandId) {
    setActiveCommand(id === "general" ? null : id);
    setInput("");
    setSlashMenuOpen(false);
    inputRef.current?.focus();
  }

  function clearActiveCommand() {
    setActiveCommand(null);
    inputRef.current?.focus();
  }

  function handleInputChange(value: string) {
    setInput(value);
    if (activeCommand) {
      setSlashMenuOpen(false);
      return;
    }
    if (value.startsWith("/")) {
      setSlashMenuOpen(true);
    } else {
      setSlashMenuOpen(false);
    }
  }

  async function handleSend(overrideText?: string, overrideCommand?: AssistantSlashCommandId | null) {
    const text = (overrideText ?? input).trim();
    if (!text && !imageBase64) return;
    if (streaming) return;

    const commandForRequest =
      overrideCommand !== undefined
        ? overrideCommand
        : activeCommand;

    const userMsg: Message = {
      role: "user",
      content: text,
      image: imagePreview ?? undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSlashMenuOpen(false);
    const capturedBase64 = imageBase64;
    const capturedCommand = commandForRequest;
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
          command: capturedCommand ?? undefined,
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
    if (slashMenuOpen && slashSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashHighlight((i) =>
          i + 1 >= slashSuggestions.length ? 0 : i + 1,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashHighlight((i) =>
          i - 1 < 0 ? slashSuggestions.length - 1 : i - 1,
        );
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashMenuOpen(false);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && slashQuery.length > 0)) {
        e.preventDefault();
        const picked = slashSuggestions[slashHighlight];
        if (picked) selectSlashCommand(picked.id);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0 && !streaming;
  const activeDef = activeCommand
    ? getSlashCommandDefinition(activeCommand)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto py-2">
        {isEmpty && (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center pb-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-blue-500 text-xl font-bold text-white shadow-lg shadow-blue-200">
              AI
            </div>
            <h2 className="mb-1 text-base font-bold text-slate-800">
              Assistant
            </h2>
            <p className="mb-5 max-w-xs text-xs leading-relaxed text-slate-400">
              Type <span className="font-mono text-slate-500">/</span> for
              commands — log nutrition, capture, calendar, vault search, and
              more.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map(({ label, text, command }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setActiveCommand(command === "general" ? null : command);
                    handleSend(text, command === "general" ? null : command);
                  }}
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

      <div className="relative shrink-0 border-t border-slate-100 pt-3">
        {slashMenuOpen && slashSuggestions.length > 0 && (
          <div
            className="absolute bottom-full left-0 right-0 z-10 mb-1 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
            role="listbox"
            aria-label="Slash commands"
          >
            {slashSuggestions.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                role="option"
                aria-selected={i === slashHighlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSlashCommand(cmd.id);
                }}
                className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors ${
                  i === slashHighlight
                    ? "bg-blue-50 text-blue-900"
                    : "text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span className="font-mono text-xs font-semibold">
                  {cmd.slash}
                </span>
                <span className="text-[11px] text-slate-500">
                  {cmd.description}
                </span>
              </button>
            ))}
          </div>
        )}

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

        {activeDef && (
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-violet-800">
              {activeDef.slash}
              <button
                type="button"
                onClick={clearActiveCommand}
                className="rounded-full p-0.5 hover:bg-violet-200"
                aria-label="Clear command mode"
              >
                <X className="h-3 w-3" strokeWidth={2} aria-hidden />
              </button>
            </span>
            <span className="text-[10px] text-slate-400">
              {activeDef.routing === "hard" ? "strict tools" : "focused"}
            </span>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
            aria-label="Attach image"
          >
            <ImageIcon strokeWidth={1.8} className="h-5 w-5" aria-hidden />
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
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeCommand
                ? `Message (${activeDef?.slash})…`
                : "Message or type / for commands…"
            }
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
              <Send strokeWidth={2} className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
