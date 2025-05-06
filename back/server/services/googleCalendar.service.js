import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Replace these with your service account credentials
      const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      };

      const auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      this.initialized = true;
      console.log('Google Calendar service initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Calendar service:', error);
      throw error;
    }
  }

  async createMeeting(title, startTime, endTime, attendeeEmail) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const event = {
        summary: title,
        start: {
          dateTime: startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC',
        },
        attendees: [{ email: attendeeEmail }],
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
      });

      if (response.data.conferenceData && response.data.conferenceData.entryPoints) {
        const meetLink = response.data.conferenceData.entryPoints.find(
          entry => entry.entryPointType === 'video'
        );
        
        return {
          meetLink: meetLink ? meetLink.uri : null,
          eventId: response.data.id,
          eventLink: response.data.htmlLink
        };
      }

      throw new Error('No conference data found in the response');
    } catch (error) {
      console.error('Error creating Google Meet event:', error);
      throw error;
    }
  }
}

export default new GoogleCalendarService(); 