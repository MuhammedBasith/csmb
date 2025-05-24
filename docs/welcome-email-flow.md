# Welcome Email & Password Setup Flow

This document outlines the new welcome email functionality for the Blowlin Dashboard, which allows super admins to send welcome emails with password setup links to newly created admin and founder accounts.

## Overview

When a super admin creates a new admin or founder account, the system now automatically sends a welcome email to the user with a link to set their password. This process uses a similar mechanism to the password reset flow but with a different email template and URL.

## Backend Implementation

The following components have been implemented on the backend:

1. **Welcome Email Method**: A new method in the `EmailService` class that sends a professionally formatted welcome email with a password setup link.
2. **Welcome Token Generation**: A new method in the `UserService` class that generates a token for password setup and sends the welcome email.
3. **Registration Enhancement**: The existing registration endpoint now automatically sends welcome emails to newly created users.
4. **Dedicated Endpoint**: A new endpoint for super admins to manually send welcome emails to existing users.

## API Endpoints

### Automatic Welcome Email on Registration

When creating a new user via the registration endpoint, a welcome email is automatically sent unless explicitly disabled.

- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth Required**: Yes (Super Admin only)
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "temporary123",
    "role": "admin",
    "bio": "Marketing specialist",
    "sendWelcomeEmail": true  // Optional, defaults to true
  }
  ```

### Manual Welcome Email

For sending welcome emails to existing users who haven't set up their passwords yet.

- **URL**: `/api/auth/welcome-email/:userId`
- **Method**: `POST`
- **Auth Required**: Yes (Super Admin only)
- **URL Parameters**: `userId` - The ID of the user to send the welcome email to
- **Response Example**:
  ```json
  {
    "success": true,
    "message": "Welcome email has been sent successfully"
  }
  ```

## Frontend Implementation Guide

To implement this feature in the frontend, you'll need to:

1. Add a "Set Password" page similar to the "Reset Password" page
2. Update the user creation form to include the welcome email option
3. Add functionality to manually send welcome emails

### 1. Set Password Page

Create a new page at `/set-password` that looks similar to the reset password page:

```jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get token from URL query params
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Use the same endpoint as reset password
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password
      });
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };
  
  if (!token) {
    return (
      <div className="error-container">
        <h2>Invalid Link</h2>
        <p>The password setup link is invalid or has expired.</p>
        <button onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }
  
  return (
    <div className="set-password-container">
      <h2>Set Your Password</h2>
      <p>Please create a secure password for your Blowlin account.</p>
      
      {success ? (
        <div className="success-message">
          <h3>Password Set Successfully!</h3>
          <p>Your password has been set. You will be redirected to the login page shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-button" 
            disabled={loading}
          >
            {loading ? 'Setting Password...' : 'Set Password'}
          </button>
        </form>
      )}
    </div>
  );
};

export default SetPassword;
```

### 2. Update User Creation Form

Add an option to the user creation form to control whether a welcome email is sent:

```jsx
// In your user creation form component
const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

// Add this to your form JSX
<div className="form-group checkbox">
  <input
    type="checkbox"
    id="sendWelcomeEmail"
    checked={sendWelcomeEmail}
    onChange={(e) => setSendWelcomeEmail(e.target.checked)}
  />
  <label htmlFor="sendWelcomeEmail">
    Send welcome email with password setup link
  </label>
</div>

// Include in your API call
const userData = {
  name,
  email,
  password: temporaryPassword, // Optional, as they'll set their own
  role,
  // Include role-specific fields (bio for admin, companyName for founder)
  ...(role === 'admin' ? { bio } : { companyName, industry }),
  sendWelcomeEmail
};
```

### 3. Add Manual Welcome Email Functionality

Add a button to send welcome emails to users who haven't set up their accounts yet:

```jsx
// In your user management component
const sendWelcomeEmail = async (userId) => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    await axios.post(`/api/auth/welcome-email/${userId}`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Show success message
    setMessage('Welcome email sent successfully');
    setMessageType('success');
  } catch (error) {
    setMessage(error.response?.data?.error || 'Failed to send welcome email');
    setMessageType('error');
  } finally {
    setLoading(false);
  }
};

// Add this button to your user list
<button 
  onClick={() => sendWelcomeEmail(user.id)}
  disabled={loading || user.verified}
  className="welcome-email-button"
>
  Send Welcome Email
</button>
```

## User Experience

1. Super admin creates a new user account (admin or founder)
2. The system automatically sends a welcome email with a password setup link
3. The user receives the email and clicks the link
4. The user is taken to the set-password page where they can create their password
5. After setting the password, the user is redirected to the login page
6. The user can now log in with their email and the password they set

## Notes

- The welcome token is valid for 24 hours (compared to 1 hour for password reset tokens)
- The user's account is marked as unverified until they set their password
- When the user sets their password via the link, their account is automatically marked as verified
- The same reset password endpoint is used for both password resets and initial password setup
- The frontend differentiates between these flows by using different URLs and UI text
