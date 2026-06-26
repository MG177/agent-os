"use client";

import { useCallback } from "react";
import { useResource, mutate, defaultFetcher } from "@/lib/data/useResource";
import { KEYS } from "@agent-os/contracts/data/keys";
import type { TodoDoc } from "@agent-os/platform/todos";

type TodosResponse = { todos: TodoDoc[] };

const TODO_POLL_MS = 60_000;

export function useDueTodos() {
  const { data, isLoading, mutate: revalidate } = useResource<TodosResponse>(
    KEYS.todosDue,
    defaultFetcher,
    { refreshInterval: TODO_POLL_MS },
  );

  const markDone = useCallback(async (id: string) => {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "done" }),
    });
    // Revalidate both due and active lists since completing a todo affects both.
    await Promise.all([
      mutate(KEYS.todosDue),
      mutate(KEYS.todosActive),
    ]);
  }, []);

  return {
    todos: data?.todos ?? [],
    loading: isLoading && !data,
    refresh: () => revalidate(),
    markDone,
  };
}

export function useTodos(status: "active" | "completed" | "all" = "active") {
  const key = status === "active"
    ? KEYS.todosActive
    : `/api/todos?status=${status}`;

  const { data, isLoading, mutate: revalidate } = useResource<TodosResponse>(
    key,
    defaultFetcher,
    { refreshInterval: TODO_POLL_MS },
  );

  const refresh = useCallback(() => revalidate(), [revalidate]);

  const markDone = useCallback(async (id: string) => {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "done" }),
    });
    await Promise.all([mutate(KEYS.todosDue), mutate(KEYS.todosActive)]);
  }, []);

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", enabled }),
    });
    await mutate(key);
  }, [key]);

  const remove = useCallback(async (id: string) => {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    await mutate(key);
  }, [key]);

  return {
    todos: data?.todos ?? [],
    loading: isLoading && !data,
    refresh,
    markDone,
    toggle,
    remove,
  };
}
