import type { AssistantModule, AssistantToolDefinition } from "@agent-os/contracts/assistant/types";
import { nutritionTools } from "@agent-os/platform/assistant/tools/nutrition";
import { vaultTools } from "@agent-os/platform/assistant/tools/vault";
import { calendarTools } from "@agent-os/platform/assistant/tools/calendar";
import { activityTools } from "@agent-os/platform/assistant/tools/activity";

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
