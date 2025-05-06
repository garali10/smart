import axios from 'axios';

class DailyService {
  constructor() {
    this.apiKey = process.env.DAILY_API_KEY;
    this.baseURL = 'https://api.daily.co/v1';
  }

  async createMeeting(title) {
    try {
      const response = await axios.post(
        `${this.baseURL}/rooms`,
        {
          name: title.toLowerCase().replace(/\s+/g, '-'),
          properties: {
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: true,
            start_audio_off: false,
            lang: 'en',
            exp: Math.round(Date.now() / 1000) + 24 * 60 * 60 // Expires in 24 hours
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      );

      return {
        meetLink: response.data.url,
        roomName: response.data.name,
        roomId: response.data.id
      };
    } catch (error) {
      console.error('Error creating Daily.co meeting:', error.response?.data || error.message);
      throw new Error('Failed to create video meeting');
    }
  }

  async deleteMeeting(roomName) {
    try {
      await axios.delete(
        `${this.baseURL}/rooms/${roomName}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`
          }
        }
      );
      return true;
    } catch (error) {
      console.error('Error deleting Daily.co meeting:', error.response?.data || error.message);
      return false;
    }
  }
}

export default new DailyService(); 