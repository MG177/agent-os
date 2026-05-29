"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ArchiveButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    setLoading(true);
    const res = await fetch(`/api/inbox/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/inbox");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={loading}
      className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-500 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-60"
    >
      {loading ? "Archiving..." : "Archive item"}
    </button>
  );
}
