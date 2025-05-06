import axios from 'axios';

class WherebyService {
  constructor() {
    this.apiKey = process.env.WHEREBY_API_KEY;
    this.baseURL = 'https://api.whereby.dev/v1/meetings';
  }

  async createMeeting() {
    try {
      const response = await axios.post(
        this.baseURL,
        {
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Whereby API response:', response.data); // Debug log
      return {
        meetLink: response.data.roomUrl,
        roomId: response.data.meetingId,
      };
    } catch (error) {
      console.error('Error creating Whereby meeting:', error.response?.data || error.message);
      throw new Error('Failed to create Whereby meeting');
    }
  }
}

export default new WherebyService(); 