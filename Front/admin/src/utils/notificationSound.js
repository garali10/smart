// Notification sound utility
const notificationSound = new Audio('/sounds/notification.mp3');

export const playNotificationSound = () => {
  try {
    notificationSound.currentTime = 0; // Reset sound to start
    notificationSound.play().catch(error => {
      console.log('Error playing notification sound:', error);
    });
  } catch (error) {
    console.error('Error with notification sound:', error);
  }
};

export default playNotificationSound; 