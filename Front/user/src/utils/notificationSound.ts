// Create a simple notification sound using HTML5 Audio
const notificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVK/n77BdGAg+ltrzxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHgU2jdXzzn0vBSF1xe/glEILElyx6OyrWBUIQ5zd8sFuJAUuhM/z1YU2Bhxqvu7mnEoODlGt5fCzYBoGPJPY88p2KwUme8rx3I4+CRZiturqpVITC0mi4PK8aB8GM4nU8tGAMQYfcsLu45ZFDBFYr+ftrVoXCECY3PLEcSYELIHO8diJOQgZaLvt559NEAxPqOPwtmMcBjiP1/PMeS0GI3fH8N2RQAoUXrTp66hVFApGnt/yvmwhBTCG0fPTgjQGHW/A7eSaRw0PVK/n77BdGAg+ltrzxnUoBSh+zPPaizsIGGS57OihUBELTKXh8bllHgU1jdXzzn0vBSJ0xe/glEILElyx6OyrWRUIQ5zd8sFuJAUug8/z1YU2Bhxqvu7mnEoPDlGt5fCzYRoGPJPY88p3KgUme8rx3I4+CRVht+rqpVMSC0mi4PK8aB8GM4nT89GAMQYfccPu45ZFDBFYr+ftrVoXCECY3PLEcSYFLIHO8diJOQgZaLvt559NEAxPqOPwtmMcBjiP1/PMeS0GI3fH8N2RQAoUXrTp66hVFApGnt/yvmwhBTCG0fPTgzQHHW/A7eSaRw0PVK/n77BdGAg+ltvyxnUoBSh+zPPaizsIGGS57OihUBELTKXh8bllHgU1jdXzzn0vBSJ0xe/glEILElyx6OyrWRUIQ5zd8sFuJAUug8/z1YU2Bhxqvu7mnEoPDlGt5fCzYRoGPJPY88p3KgUme8rx3I4+CRVht+rqpVMSC0mi4PK8aB8GM4nT89GAMQYfccPu45ZFDBFYr+ftrVoXCECY3PLEcSYFLIHO8diJOQgZabzv559NEAxPqOPwtmMcBjiP1/PMeS0GI3fH8N2RQAoUXrTp66hVFApGnt/yvmwhBTCG0fPTgzQHHW/A7eSaRw0PVK/n77BdGAg+ltvyxnUoBSh+zPPaizsIGGS57OihUBELTKXh8bllHgU1jdXzzn0vBSJ0xe/glEILElyx6OyrWRUIQ5zd8sFuJAUug8/z1YU2Bhxqvu7mnEoPDlGt5fCzYRoGPJPY88p3KgUme8rx3I4+CRVht+rqpVMSC0mi4PK8aB8GM4nT89GAMQYfccPu45ZFDBFYr+ftrVoXCECY3PLEcSYF');

export const playNotificationSound = async () => {
  try {
    // Reset the audio to the beginning
    notificationSound.currentTime = 0;
    // Play the sound
    await notificationSound.play();
    console.log('Notification sound played successfully');
  } catch (error) {
    console.error('Error playing notification sound:', error);
    throw error;
  }
};

export default playNotificationSound; 