// Google Calendar API integration for Chrome Extension

// Create a calendar event
async function createCalendarEvent(token, calendarId, eventData) {
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Calendar API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

// Get user's primary calendar
async function getPrimaryCalendar(token) {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get primary calendar: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error getting primary calendar:', error);
    throw error;
  }
}

// List user's calendars
async function listCalendars(token) {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list calendars: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error listing calendars:', error);
    throw error;
  }
}

// Create a wedding-related calendar event
async function createWeddingEvent(token, calendarId, eventDetails) {
  const eventData = {
    summary: eventDetails.title || 'Wedding Event',
    description: eventDetails.description || '',
    start: {
      dateTime: eventDetails.startTime,
      timeZone: eventDetails.timeZone || 'UTC'
    },
    end: {
      dateTime: eventDetails.endTime,
      timeZone: eventDetails.timeZone || 'UTC'
    },
    attendees: eventDetails.attendees || [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 }
      ]
    }
  };
  
  return createCalendarEvent(token, calendarId, eventData);
}

// Create RSVP deadline reminder
async function createRSVPDeadline(token, calendarId, deadlineDate, eventTitle) {
  const eventData = {
    summary: `RSVP Deadline - ${eventTitle}`,
    description: 'Final deadline for RSVP responses',
    start: {
      date: deadlineDate, // All-day event
      timeZone: 'UTC'
    },
    end: {
      date: deadlineDate,
      timeZone: 'UTC'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 * 7 }, // 1 week before
        { method: 'popup', minutes: 24 * 60 } // 1 day before
      ]
    }
  };
  
  return createCalendarEvent(token, calendarId, eventData);
}

// Export functions for use in popup.js
window.createCalendarEvent = createCalendarEvent;
window.getPrimaryCalendar = getPrimaryCalendar;
window.listCalendars = listCalendars;
window.createWeddingEvent = createWeddingEvent;
window.createRSVPDeadline = createRSVPDeadline; 