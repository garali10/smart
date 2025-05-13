import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { FaCamera, FaCheck, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './FaceRecognition.css';

const FaceRegistration = ({ onSuccess, onCancel }) => {
  const { user, registerFaceData } = useAuth();
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [stream, setStream] = useState(null);
  const [message, setMessage] = useState('Setting up face registration...');
  const [status, setStatus] = useState('loading'); // loading, scanning, success, error
  const [captures, setCaptures] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [detectionInterval, setDetectionInterval] = useState(null);

  useEffect(() => {
    // Load models and set up camera
    const loadModels = async () => {
      setMessage('Loading face recognition models...');
      
      // Use CDN URL instead of local files
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      
      try {
        console.log('Attempting to load face-api.js models from CDN:', MODEL_URL);
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        console.log('Face-api.js models loaded successfully');
        setModelsLoaded(true);
        setMessage('Models loaded. Starting camera...');
        
        // Check if user already has stored face data
        const storedFaceData = localStorage.getItem('faceDescriptor');
        if (storedFaceData) {
          setMessage('You already have face data registered. Capturing a new face will replace the existing one.');
        }
      } catch (error) {
        console.error('Error loading models:', error);
        setMessage('Error loading face recognition models. Please try again later.');
        setStatus('error');
      }
    };

    loadModels();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (modelsLoaded) {
      startVideo();
    }
  }, [modelsLoaded]);

  const startVideo = async () => {
    try {
      console.log('Attempting to access camera');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        } 
      });
      console.log('Camera access successful');
      setStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('scanning');
      setMessage('Camera started. Position your face in the frame and click "Capture Face"');
    } catch (error) {
      console.error('Error accessing camera:', error);
      setMessage('Error accessing camera. Please ensure camera permissions are granted and try again.');
      setStatus('error');
    }
  };

  const handleVideoPlay = () => {
    if (!canvasRef.current || !videoRef.current || !modelsLoaded) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    
    faceapi.matchDimensions(canvas, displaySize);
    
    const interval = setInterval(async () => {
      if (status !== 'scanning' || processing) {
        return;
      }
      
      try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();
        
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections.length > 0) {
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }
      } catch (error) {
        console.error('Error in face detection:', error);
        setMessage('Error in face detection. Please try again.');
      }
    }, 100);

    setDetectionInterval(interval);
    return () => clearInterval(interval);
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || processing) return;
    
    setProcessing(true);
    setMessage('Capturing face data...');
    
    try {
      const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      if (detections.length === 0) {
        setMessage('No face detected. Please position your face clearly in the frame.');
        setProcessing(false);
        return;
      }
      
      if (detections.length > 1) {
        setMessage('Multiple faces detected. Please ensure only your face is in the frame.');
        setProcessing(false);
        return;
      }
      
      const descriptor = detections[0].descriptor;
      setCaptures([...captures, descriptor]);
      
      if (captures.length >= 2) {
        setMessage('Processing your face data...');
        
        // Calculate average descriptor from all captures
        const avgDescriptor = new Float32Array(128);
        const allDescriptors = [...captures, descriptor];
        
        for (let i = 0; i < 128; i++) {
          let sum = 0;
          for (const desc of allDescriptors) {
            sum += desc[i];
          }
          avgDescriptor[i] = sum / allDescriptors.length;
        }
        
        console.log('Face registration - storing face descriptor data');
        
        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (userData && token) {
          const userObj = JSON.parse(userData);
          const userEmail = userObj.email;
          
          if (userEmail) {
            console.log(`Face registration - saving face data for user: ${userEmail}`);
            
            // Create a key specific to this user's email
            const userFaceDataKey = `faceDescriptor_${userEmail}`;
            
            // Store the descriptor in localStorage with user-specific key
            localStorage.setItem(userFaceDataKey, JSON.stringify(Array.from(avgDescriptor)));
            
            // Save the list of registered users if it doesn't exist
            let registeredUsers = JSON.parse(localStorage.getItem('faceIdRegisteredUsers') || '[]');
            if (!registeredUsers.includes(userEmail)) {
              registeredUsers.push(userEmail);
              localStorage.setItem('faceIdRegisteredUsers', JSON.stringify(registeredUsers));
            }
            
            // Also store user auth data for this specific user
            localStorage.setItem(`faceUserData_${userEmail}`, userData);
            localStorage.setItem(`faceToken_${userEmail}`, token);
            
            // Store current user as the last registered face user
            localStorage.setItem('lastFaceIdUser', userEmail);
          } else {
            console.warn('Face registration - user email not found');
          }
        } else {
          console.warn('Face registration - no user data or token found in localStorage');
        }
        
        // Register with context if available
        if (registerFaceData) {
          try {
            await registerFaceData(avgDescriptor);
            console.log('Face registration - registerFaceData called successfully');
          } catch (err) {
            console.error('Error calling registerFaceData:', err);
          }
        }
        
        setStatus('success');
        setMessage('Face registration successful! You can now use face recognition to log in.');
        
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        setMessage(`Capture successful! ${3 - (captures.length + 1)} more captures needed. Please move slightly and capture again.`);
      }
    } catch (error) {
      console.error('Error capturing face:', error);
      setMessage('Error capturing face data. Please try again.');
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="face-recognition-container">
      <div className="face-recognition-content">
        <div className="status-indicator">
          {status === 'loading' && <div className="loading-spinner"></div>}
          {status === 'error' && <FaTimes className="status-icon error" />}
          {status === 'success' && <FaCheck className="status-icon success" />}
          <p className={`status-message ${status}`}>{message}</p>
        </div>
        
        <div className="video-container">
          <video
            ref={videoRef}
            autoPlay
            muted
            onPlay={handleVideoPlay}
            className={status === 'success' ? 'face-match' : ''}
          />
          <canvas ref={canvasRef} className="face-canvas" />
        </div>
        
        {status === 'scanning' && (
          <button 
            className="face-login-btn" 
            onClick={captureFace}
            disabled={processing}
            style={{ marginTop: '20px' }}
          >
            <FaCamera /> {processing ? 'Processing...' : 'Capture Face'}
          </button>
        )}
        
        {status === 'scanning' && (
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
            style={{ marginTop: '10px' }}
          >
            Cancel
          </button>
        )}
        
        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
          <p>For best results:</p>
          <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
            <li>Ensure good lighting on your face</li>
            <li>Position your face clearly in the frame</li>
            <li>We'll take multiple captures for better accuracy</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration; 