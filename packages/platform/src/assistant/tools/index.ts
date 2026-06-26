import type { AssistantToolDefinition } from "@agent-os/contracts/assistant/types";
import { nutritionTools } from "@agent-os/platform/assistant/tools/nutrition";
import { vaultTools } from "@agent-os/platform/assistant/tools/vault";
import { calendarTools } from "@agent-os/platform/assistant/tools/calendar";
import { activityTools } from "@agent-os/platform/assistant/tools/activity";

export const allAssistantTools: AssistantToolDefinition[] = [
  ...nutritionTools,
  ...vaultTools,
  ...calendarTools,
  ...activityTools,
];
