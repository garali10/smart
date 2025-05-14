import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navigation from "./components/Navigation/Navigation";
import { Gallery } from "./components/gallery";
import { Header } from "./components/header";
import { Features } from "./components/features";
import { About } from "./components/about";
import { Services } from "./components/services";
import { Testimonials } from "./components/testimonials";
import { Team } from "./components/Team";
import { Contact } from "./components/contact";
import LoginPage from './components/Auth/LoginPage';
import ProfilePage from './components/Profile/ProfilePage';
import AuthPage from './components/Auth/AuthPage';
import EditProfile from './components/Profile/EditProfile';
import UpdatePassword from './components/Profile/UpdatePassword';
import MyApplications from './components/Profile/MyApplications';
import Favorites from './pages/Favorites';
import MbtiTest from './pages/Profile/MbtiTest';
import MbtiTestSimple from './components/MbtiTestSimple';
import QRCodeLanding from './components/QRCodeLanding';
import JsonData from "./data/data.json";
import SmoothScroll from "smooth-scroll";
import "./App.css";

// Create a simple test component to use as fallback
const TestPageFallback = () => {
  return (
    <div style={{ 
      maxWidth: '800px',
      margin: '50px auto',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      textAlign: 'center' 
    }}>
      <h1>MBTI Test Page</h1>
      <p>This is a simple test page to verify routing works correctly.</p>
      <p>If you see this page, the routing is working but there might be an issue with the MbtiTest component.</p>
    </div>
  );
};

// Create an extremely simple test page with nothing but text
const SimplestTestPage = () => {
  return <div style={{padding: '50px', textAlign: 'center'}}><h1>Simple Test Page</h1></div>;
};

export const scroll = new SmoothScroll('a[href*="#"]', {
  speed: 1000,
  speedAsDuration: true,
});

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; 
  }

  return isAuthenticated ? children : <Navigate to="/auth" />;
};

const App = () => {
  const [landingPageData, setLandingPageData] = useState({});
  useEffect(() => {
    setLandingPageData(JsonData);
  }, []);

  return (
    <AuthProvider>
      <div>
        <Navigation />
        <div className="content">
          <Routes>
            {/* QR Code Landing Page - accessible without authentication */}
            <Route path="/qr-code" element={<QRCodeLanding />} />
            
            {/* Simple MBTI test with no auth protection or nested elements */}
            <Route path="/mbti-simple" element={<MbtiTestSimple />} />
            
            {/* Simplest test page with no auth protection or nested elements */}
            <Route path="/simple-test" element={<SimplestTestPage />} />
            
            {/* Regular routes */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Use the fallback test component first to verify routing */}
            <Route 
              path="/mbti-test-fallback" 
              element={
                <PrivateRoute>
                  <TestPageFallback />
                </PrivateRoute>
              } 
            />
            
            {/* MbtiTest route - as a direct component outside PrivateRoute first */}
            <Route path="/mbti-test" element={
              <PrivateRoute>
                <MbtiTest />
              </PrivateRoute>
            } />
            
            {/* Favorites route */}
            <Route 
              path="/favorites" 
              element={
                <PrivateRoute>
                  <Favorites />
                </PrivateRoute>
              } 
            />
            
            {/* Other protected routes */}
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/edit-profile" 
              element={
                <PrivateRoute>
                  <EditProfile />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/update-password" 
              element={
                <PrivateRoute>
                  <UpdatePassword />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/my-applications" 
              element={
                <PrivateRoute>
                  <MyApplications />
                </PrivateRoute>
              } 
            />

            {/* Add specific route for the profile/applications path */}
            <Route 
              path="/profile/applications" 
              element={
                <PrivateRoute>
                  <MyApplications />
                </PrivateRoute>
              } 
            />

            {/* Home route */}
            <Route path="/" element={
              <>
                <Header />
                <Features data={landingPageData.Features} />
                <About data={landingPageData.About} />
                <Services data={landingPageData.Services} />
                <Gallery data={landingPageData.Gallery} />
                <Testimonials data={landingPageData.Testimonials} />
                <Team data={landingPageData.Team} />
                <Contact data={landingPageData.Contact} />
              </>
            } />

            {/* Catch-all route - keep this at the very end */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
};

export default App;