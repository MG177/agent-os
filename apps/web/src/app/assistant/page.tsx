"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAssistantSession } from "@/components/assistant/AssistantSessionContext";

export default function AssistantIndexPage() {
  const router = useRouter();
  const { ready, activeSessionId } = useAssistantSession();

  useEffect(() => {
    if (ready && activeSessionId) {
      router.replace(`/assistant/${activeSessionId}`);
    }
  }, [ready, activeSessionId, router]);

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <p className="text-sm text-slate-400">Loading assistant…</p>
    </div>
  );
}
