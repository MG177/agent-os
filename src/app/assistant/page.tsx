import AssistantChat from "@/components/assistant/AssistantChat";

export const metadata = {
  title: "Assistant · Agent OS",
};

export default function AssistantPage() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 md:px-8 md:py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white shadow-sm shadow-blue-200">
          AI
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl md:tracking-tight">
            Assistant
          </h1>
          <p className="text-xs text-slate-400">
            Chat, capture, and log across your Agent OS
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 md:px-8 md:py-5">
        <AssistantChat />
      </div>
    </div>
  );
}
