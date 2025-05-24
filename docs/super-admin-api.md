# Super Admin API Documentation

This document outlines the API endpoints available for the Super Admin to manage admins and founders in the Blowlin Dashboard.

## Authentication

All endpoints require authentication with a valid JWT token. The token must belong to a user with the `super-admin` role.

Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Get All Admins

Retrieves a list of all admins with their complete details.

- **URL**: `/api/auth/admins`
- **Method**: `GET`
- **Auth Required**: Yes (Super Admin only)
- **Permissions Required**: `canManageUsers`

#### Success Response

- **Code**: `200 OK`
- **Content Example**:

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "verified": true,
      "bio": "Marketing specialist with 5 years of experience",
      "createdAt": "2023-01-15T08:30:00.000Z",
      "updatedAt": "2023-01-15T08:30:00.000Z"
    },
    {
      "id": "60d21b4667d0d8992e610c86",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "admin",
      "verified": true,
      "bio": "Product manager with expertise in SaaS",
      "createdAt": "2023-01-16T10:15:00.000Z",
      "updatedAt": "2023-01-16T10:15:00.000Z"
    }
  ]
}
```

### Get All Founders

Retrieves a list of all founders with their complete details.

- **URL**: `/api/auth/founders`
- **Method**: `GET`
- **Auth Required**: Yes (Super Admin only)
- **Permissions Required**: `canManageUsers`

#### Success Response

- **Code**: `200 OK`
- **Content Example**:

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "60d21b4667d0d8992e610c87",
      "name": "Alex Johnson",
      "email": "alex@startup.com",
      "role": "founder",
      "verified": true,
      "companyName": "TechStart Inc.",
      "industry": "Software Development",
      "notes": "Looking for Series A funding",
      "createdAt": "2023-02-10T14:20:00.000Z",
      "updatedAt": "2023-02-10T14:20:00.000Z"
    },
    {
      "id": "60d21b4667d0d8992e610c88",
      "name": "Sarah Williams",
      "email": "sarah@innovate.io",
      "role": "founder",
      "verified": true,
      "companyName": "Innovate Solutions",
      "industry": "HealthTech",
      "notes": "Developing AI-driven health monitoring system",
      "createdAt": "2023-02-15T09:45:00.000Z",
      "updatedAt": "2023-02-15T09:45:00.000Z"
    }
  ]
}
```

## Error Responses

### Unauthorized

- **Code**: `401 Unauthorized`
- **Content**:

```json
{
  "success": false,
  "error": "Not authenticated"
}
```

### Forbidden

- **Code**: `403 Forbidden`
- **Content**:

```json
{
  "success": false,
  "error": "Not authorized to access this resource"
}
```

## Integration Guide for Frontend

### Example Usage with Axios

```javascript
// Get all admins
const getAdmins = async () => {
  try {
    const response = await axios.get('/api/auth/admins', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching admins:', error);
    throw error;
  }
};

// Get all founders
const getFounders = async () => {
  try {
    const response = await axios.get('/api/auth/founders', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching founders:', error);
    throw error;
  }
};
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminList = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/auth/admins', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setAdmins(response.data.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch admins');
        setLoading(false);
      }
    };
    
    fetchAdmins();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Admin List</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Bio</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {admins.map(admin => (
            <tr key={admin.id}>
              <td>{admin.name}</td>
              <td>{admin.email}</td>
              <td>{admin.bio}</td>
              <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminList;
```
