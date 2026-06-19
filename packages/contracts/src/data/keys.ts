export const KEYS = {
  home: "/api/home",
  health: "/api/health",
  tasksDueAll: "/api/clickup/tasks?due=all",
  sprintLatest: "/api/clickup/sprint/latest",
  calendarStatus: "/api/integrations/google-calendar/status",
  // Synthetic stable key for the Home 24h schedule window.
  // The fetcher always computes the real URL from the current time.
  calendarHomeEvents: "/home/calendar-events",
  todosDue: "/api/todos?due=true",
  todosActive: "/api/todos?status=active",
  clickupTime: "/api/clickup/time",
} as const;
