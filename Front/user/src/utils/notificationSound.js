// Create a notification sound using Web Audio API
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  const playNotificationSound = () => {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set sound properties
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 note
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      // Start sound
      oscillator.start();
      
      // Stop sound after 0.2 seconds
      oscillator.stop(audioContext.currentTime + 0.2);
      
      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  return playNotificationSound;
};

export const playNotificationSound = createNotificationSound();

export default playNotificationSound; 