import type { AssistantModule, AssistantToolDefinition } from "@/lib/assistant/types";
import { nutritionTools } from "@/lib/assistant/tools/nutrition";
import { vaultTools } from "@/lib/assistant/tools/vault";
import { calendarTools } from "@/lib/assistant/tools/calendar";
import { activityTools } from "@/lib/assistant/tools/activity";

/** Future modules register here without changing runtime wiring. */
export const FUTURE_MODULES: AssistantModule[] = ["core"];

export const allAssistantTools: AssistantToolDefinition[] = [
  ...nutritionTools,
  ...vaultTools,
  ...calendarTools,
  ...activityTools,
];

export function toolsByModule(module: AssistantModule): AssistantToolDefinition[] {
  return allAssistantTools.filter((t) => t.module === module);
}
