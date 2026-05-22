import { getAccessToken } from '../lib/auth';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  htmlLink?: string;
}

export const listCalendarEvents = async (maxResults = 20): Promise<CalendarEvent[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  const now = new Date().toISOString();
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=${now}&maxResults=${maxResults}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Calendar API error: ${error.error?.message || 'Failed to list events'}`);
  }

  const data = await response.json();
  return data.items || [];
};

export const createCalendarEvent = async (event: {
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  location?: string;
}): Promise<CalendarEvent> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Calendar API error: ${error.error?.message || 'Failed to create event'}`);
  }

  return response.json();
};

export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token available. Please sign in with Google.');

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Calendar API error: ${error.error?.message || 'Failed to delete event'}`);
  }
};
