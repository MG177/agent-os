export interface CalendarEventSummary {
  /** Unique across calendars: `{calendarId}:{eventId}` */
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarId: string;
  calendarName: string;
  location?: string;
  htmlLink?: string;
}

export interface GoogleCalendarTokenRecord {
  encryptedRefreshToken: string;
  email?: string;
  connectedAt: string;
  updatedAt: string;
}

export interface GoogleCalendarStatus {
  connected: boolean;
  configured: boolean;
  email?: string;
  connectedAt?: string;
}
