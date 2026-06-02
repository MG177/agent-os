"use client";

import { useState, useEffect, useCallback } from "react";
import type { TodoDoc } from "@/lib/todos";

export function useTodos(status: "active" | "completed" | "all" = "active") {
  const [todos, setTodos] = useState<TodoDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/todos?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos);
      }
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, [fetch_]);

  const markDone = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "done" }),
      });
      if (res.ok) fetch_();
    },
    [fetch_],
  );

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", enabled }),
      });
      if (res.ok) fetch_();
    },
    [fetch_],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (res.ok) fetch_();
    },
    [fetch_],
  );

  return { todos, loading, refresh: fetch_, markDone, toggle, remove };
}

export function useDueTodos() {
  const [todos, setTodos] = useState<TodoDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/todos?due=true");
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, [fetch_]);

  const markDone = useCallback(
    async (id: string) => {
      await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "done" }),
      });
      fetch_();
    },
    [fetch_],
  );

  return { todos, loading, refresh: fetch_, markDone };
}
