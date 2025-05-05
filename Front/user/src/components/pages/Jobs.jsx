import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import './navigation.css';
import { useClickOutside } from '../hooks/useClickOutside';

export const Navigation = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  useClickOutside(dropdownRef, () => setShowDropdown(false));

  const handleProfileClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      setShowDropdown(!showDropdown);
    } else {
      navigate('/auth');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
    setShowDropdown(false);
  };

  const handleNavigation = (path) => {
    if (path.startsWith('#')) {
      // For anchor links on home page
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const element = document.querySelector(path);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        const element = document.querySelector(path);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      // For route navigation
      navigate(path);
    }
  };

  return (
    <nav id="menu" className="navbar navbar-default navbar-fixed-top">
      <div className="container">
        <div className="navbar-header">
          <button
            type="button"
            className="navbar-toggle collapsed"
            data-toggle="collapse"
            data-target="#bs-example-navbar-collapse-1"
          >
            {" "}
            <span className="sr-only">Toggle navigation</span>{" "}
            <span className="icon-bar"></span>{" "}
            <span className="icon-bar"></span>{" "}
            <span className="icon-bar"></span>{" "}
          </button>
          <Link 
            className="navbar-brand" 
            to="/"
            onClick={() => handleNavigation('#page-top')}
          >
            <img 
              src="/img/esprit.jpg" 
              alt="Esprit Logo" 
              className="brand-logo"
            />
            SMART HIRE
          </Link>{" "}
        </div>

        <div
          className="collapse navbar-collapse"
          id="bs-example-navbar-collapse-1"
        >
          <ul className="nav navbar-nav navbar-right">
            <li>
              <button 
                onClick={() => handleNavigation('#features')} 
                className="nav-link"
              >
                HOME
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('#about')} 
                className="nav-link"
              >
                ABOUT
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('#portfolio')} 
                className="nav-link"
              >
                JOB APPLICATION
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('#testimonials')} 
                className="nav-link"
              >
                INFORMATIONS
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('#team')} 
                className="nav-link"
              >
                Team
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigation('#contact')} 
                className="nav-link"
              >
                CONTACT
              </button>
            </li>
            <li className="profile-menu-item" ref={dropdownRef}>
              <button 
                onClick={handleProfileClick}
                className="profile-link nav-link"
              >
                {isAuthenticated ? (
                  <FaUserCircle size={24} />
                ) : (
                  "Sign In"
                )}
              </button>
              {isAuthenticated && showDropdown && (
                <div className="profile-dropdown ">
                  <Link to="/profile" className="dropdown-item">
                    <FaUserCircle />
                    Profile
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="dropdown-item logout-button"
                  >
                    <FaSignOutAlt />
                    Logout
                  </button>
                </div>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};
