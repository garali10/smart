import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import './FaceRecognition.css';
import { useAuth } from '../context/AuthContext';
import { FaTimesCircle, FaCheckCircle, FaUser } from 'react-icons/fa';

const FaceRecognition = ({ onSuccess }) => {
  const { user } = useAuth();
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [stream, setStream] = useState(null);
  const [message, setMessage] = useState('Loading face recognition...');
  const [status, setStatus] = useState('loading'); // loading, scanning, success, error
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [registeredFaces, setRegisteredFaces] = useState([]);
  const [detectionInterval, setDetectionInterval] = useState(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [lastMatchScore, setLastMatchScore] = useState(null);
  const [matchedUser, setMatchedUser] = useState(null);
  
  // Constants for face recognition
  const MAX_SCAN_ATTEMPTS = 15; // About 5 seconds with 300ms interval
  const MATCH_THRESHOLD = 0.5; // Lower means more strict

  useEffect(() => {
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
        setMessage('Models loaded. Loading registered faces...');
        
        // Load all registered users
        const registeredUsersList = JSON.parse(localStorage.getItem('faceIdRegisteredUsers') || '[]');
        setRegisteredUsers(registeredUsersList);
        
        if (registeredUsersList.length === 0) {
          setMessage('No registered faces found. Please register your face first in your profile page.');
          setStatus('error');
          return;
        }
        
        console.log(`Found ${registeredUsersList.length} registered users with face data`);
        
        // Load all face descriptors for registered users
        const loadedFaces = [];
        for (const email of registeredUsersList) {
          const faceData = localStorage.getItem(`faceDescriptor_${email}`);
          if (faceData) {
            try {
              const descriptor = Float32Array.from(JSON.parse(faceData));
              loadedFaces.push({
                email,
                descriptor
              });
              console.log(`Loaded face data for user: ${email}`);
            } catch (error) {
              console.error(`Error parsing face data for user ${email}:`, error);
            }
          }
        }
        
        setRegisteredFaces(loadedFaces);
        
        if (loadedFaces.length > 0) {
          setMessage('Face data loaded. Starting camera...');
          setStatus('scanning');
        } else {
          setMessage('No valid face data found. Please register your face first in your profile page.');
          setStatus('error');
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
    if (modelsLoaded && registeredFaces.length > 0) {
      startVideo();
    }
  }, [modelsLoaded, registeredFaces]);

  const startVideo = async () => {
    try {
      console.log('Attempting to access camera');
      
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Request camera access
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user" 
        } 
      });
      
      console.log('Camera access successful');
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        
        // Return a promise that resolves when the video is ready to play
        return new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            resolve();
          };
        });
      }
      
      return Promise.resolve(); // Resolve immediately if videoRef is not available
    } catch (error) {
      console.error('Error accessing camera:', error);
      setMessage('Error accessing camera. Please ensure camera permissions are granted and try again.');
      setStatus('error');
      return Promise.reject(error);
    }
  };

  const handleVideoPlay = () => {
    if (!canvasRef.current || !videoRef.current || !modelsLoaded || registeredFaces.length === 0) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    
    faceapi.matchDimensions(canvas, displaySize);
    
    // Reset scan attempts counter
    setScanAttempts(0);
    
    const interval = setInterval(async () => {
      if (status === 'success' || status === 'error') {
        clearInterval(interval);
        return;
      }
      
      // Increment attempt counter each time
      setScanAttempts(prev => {
        const newCount = prev + 1;
        console.log(`Scan attempt ${newCount} of ${MAX_SCAN_ATTEMPTS}`);
        
        // Check if max attempts reached
        if (newCount >= MAX_SCAN_ATTEMPTS) {
          console.log('Max scan attempts reached, stopping recognition');
          setStatus('error');
          setMessage('Face not recognized. Please try again or use password login.');
          clearInterval(interval);
        }
        return newCount;
      });
      
      try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();
        
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections.length > 0) {
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          
          // Get face descriptor from detection
          const faceDescriptor = detections[0].descriptor;
          
          // Check against all registered faces
          let bestMatch = null;
          let bestMatchDistance = 1.0; // Initialize with max possible distance
          
          for (const registeredFace of registeredFaces) {
            const distance = faceapi.euclideanDistance(faceDescriptor, registeredFace.descriptor);
            console.log(`Face match distance for ${registeredFace.email}: ${distance}`);
            
            // If this is a better match than what we've seen so far
            if (distance < bestMatchDistance) {
              bestMatchDistance = distance;
              bestMatch = registeredFace;
            }
          }
          
          const matchPercent = Math.round((1 - bestMatchDistance) * 100);
          setLastMatchScore(matchPercent);
          
          // If we have a good match
          if (bestMatch && bestMatchDistance < MATCH_THRESHOLD) {
            setMessage(`Face recognized! Logging in as ${bestMatch.email}...`);
            setStatus('success');
            setMatchedUser(bestMatch.email);
            
            // Get the auth data for this specific user
            const userData = localStorage.getItem(`faceUserData_${bestMatch.email}`);
            const token = localStorage.getItem(`faceToken_${bestMatch.email}`);
            
            console.log(`Face login - using auth data for: ${bestMatch.email}`);
            
            // Make sure we have both the user data and token before proceeding
            if (userData && token && onSuccess) {
              // Use a shorter delay to improve user experience
              setTimeout(() => {
                console.log('Calling onSuccess with credentials');
                onSuccess({
                  token: token,
                  user: JSON.parse(userData)
                });
              }, 1000);
            } else {
              console.error('Missing user data or token for face login');
              setMessage(`Login failed for ${bestMatch.email}: Missing credentials. Please try password login.`);
              setStatus('error');
            }
            
            clearInterval(interval);
          } else {
            // Don't check attempts here, we're doing it at the start of each interval
            setMessage(`Scanning... (Best match: ${matchPercent}%)`);
          }
        } else {
          setMessage('No face detected. Please position your face in the frame.');
        }
      } catch (error) {
        console.error('Error in face detection:', error);
        setMessage('Error in face detection. Please try again.');
        setStatus('error');
        clearInterval(interval);
      }
    }, 300); // Slightly longer interval for more stable detection

    setDetectionInterval(interval);
    return () => clearInterval(interval);
  };

  const restartFaceDetection = () => {
    console.log('Restarting face detection');
    
    // Reset states
    setStatus('scanning');
    setScanAttempts(0);
    setMessage('Looking for your face...');
    setMatchedUser(null);
    
    // Clear any existing interval
    if (detectionInterval) {
      clearInterval(detectionInterval);
      setDetectionInterval(null);
    }
    
    // Restart video if needed
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    
    // Get fresh camera access
    startVideo().then(() => {
      console.log('Camera restarted for face detection');
    }).catch(err => {
      console.error('Failed to restart camera:', err);
      setStatus('error');
      setMessage('Failed to access camera. Please check permissions.');
    });
  };

  return (
    <div className="face-recognition-container">
      <div className="face-recognition-content">
        <div className="status-indicator">
          {status === 'loading' && <div className="loading-spinner"></div>}
          {status === 'error' && <FaTimesCircle className="status-icon error" />}
          {status === 'success' && <FaCheckCircle className="status-icon success" />}
          <p className={`status-message ${status}`}>{message}</p>
          
          {lastMatchScore !== null && status === 'error' && (
            <p className="match-score">Last match score: {lastMatchScore}%</p>
          )}
          
          {matchedUser && status === 'success' && (
            <p className="matched-user"><FaUser /> {matchedUser}</p>
          )}
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
        
        {status === 'error' && (
          <button 
            className="retry-button"
            onClick={restartFaceDetection}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default FaceRecognition;