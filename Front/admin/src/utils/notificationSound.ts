// Simple notification sound using base64-encoded WAV
// This is a short beep sound encoded as base64
const AUDIO_BASE64 = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT19AAAAAAP+fj39/b19PTz8vHw8PBwcDAwEBAQEBAQMHBw8PHy8/T19vf4+fn///AAD/n49/f29fT08/Lx8PDwcHAwMBAQEBAQEDBwcPDx8vP09fb3+Pn5//';

// Create audio element
const audio = new Audio(AUDIO_BASE64);

export const playNotificationSound = () => {
  try {
    console.log('=== NOTIFICATION SOUND DEBUG ===');
    console.log('1. Attempting to play notification sound...');
    
    // Reset audio to start
    audio.currentTime = 0;
    console.log('2. Reset audio.currentTime to 0');
    
    // Play the sound
    console.log('3. Calling audio.play()');
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      console.log('4. Play promise received');
      playPromise
        .then(() => {
          console.log('5. SUCCESS: Notification sound played successfully');
        })
        .catch((error) => {
          console.error('5. ERROR: Failed to play notification sound:', error);
          
          // Fallback to system beep if available
          if (window.navigator && window.navigator.vibrate) {
            console.log('6. Attempting vibration fallback');
            window.navigator.vibrate(200);
          } else {
            console.log('6. Vibration not available');
          }
        });
    } else {
      console.log('4. Play promise is undefined');
    }
  } catch (error) {
    console.error('ERROR: Exception in playNotificationSound:', error);
  }
  console.log('=== END DEBUG ===');
};

export default playNotificationSound;