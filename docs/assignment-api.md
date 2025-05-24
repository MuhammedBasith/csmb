# Admin-Founder Assignment API Documentation

This document outlines the API endpoints for managing Admin-to-Founder assignments in the Blowlin Dashboard.

## Overview

The assignment system allows Super Admins to assign one or more Admins to a specific Founder. This creates a relationship where only assigned Admins can manage a Founder's content.

## Authentication

All endpoints require authentication with a valid JWT token. The token must belong to a user with the `super-admin` role.

Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Assign Admins to a Founder

Assigns one or more Admins to a specific Founder. This will replace any existing assignments for the Founder.

- **URL**: `/api/v1/assignments`
- **Method**: `POST`
- **Auth Required**: Yes (Super Admin only)
- **Permissions Required**: `canManageUsers`

#### Request Body

```json
{
  "founderId": "644e5c8b2c12345678901234",
  "adminIds": ["644a1d2b2c12345678901234", "644b3f4b2c12345678901234"]
}
```

#### Success Response

- **Code**: `200 OK`
- **Content Example**:

```json
{
  "success": true,
  "message": "Successfully assigned 2 admin(s) to founder"
}
```

#### Error Responses

- **Code**: `400 Bad Request`
- **Content**:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Invalid request data"
}
```

OR

- **Code**: `404 Not Found`
- **Content**:

```json
{
  "status": "error",
  "statusCode": 404,
  "message": "Founder not found"
}
```

OR

- **Code**: `400 Bad Request`
- **Content**:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "User with ID 644a1d2b2c12345678901234 is not an admin"
}
```

### Get Assigned Admins

Retrieves all Admins assigned to a specific Founder.

- **URL**: `/api/v1/assignments?founderId=644e5c8b2c12345678901234`
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
      "adminId": "644a1d2b2c12345678901234",
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "adminId": "644b3f4b2c12345678901234",
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ]
}
```

### Get Assigned Founders

Retrieves all Founders assigned to a specific Admin.

- **URL**: `/api/v1/assignments/founders?adminId=644a1d2b2c12345678901234`
- **Method**: `GET`
- **Auth Required**: Yes (Super Admin or the Admin in question)
- **Permissions Required**: None (Admin can view their own assignments)

#### Success Response

- **Code**: `200 OK`
- **Content Example**:

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "founderId": "644e5c8b2c12345678901234",
      "name": "Alex Johnson",
      "email": "alex@startup.com",
      "companyName": "TechStart Inc.",
      "industry": "Software Development"
    },
    {
      "founderId": "644f7d9b2c12345678901234",
      "name": "Sarah Williams",
      "email": "sarah@innovate.io",
      "companyName": "Innovate Solutions",
      "industry": "HealthTech"
    }
  ]
}
```

### Delete a Specific Assignment

Deletes a specific assignment between an Admin and a Founder.

- **URL**: `/api/v1/assignments/:adminId/:founderId`
- **Method**: `DELETE`
- **Auth Required**: Yes (Super Admin only)
- **Permissions Required**: `canManageUsers`
- **URL Parameters**: 
  - `adminId`: ID of the admin
  - `founderId`: ID of the founder

#### Success Response

- **Code**: `200 OK`
- **Content Example**:

```json
{
  "success": true,
  "message": "Assignment deleted successfully"
}
```

#### Error Responses

- **Code**: `400 Bad Request`
- **Content**:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Founder ID is required"
}
```

OR

- **Code**: `404 Not Found`
- **Content**:

```json
{
  "status": "error",
  "statusCode": 404,
  "message": "Founder not found"
}
```

## Integration Guide

### Example Usage with Axios

```javascript
// Assign admins to a founder
const assignAdminsToFounder = async (founderId, adminIds) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      '/api/v1/assignments',
      {
        founderId,
        adminIds
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error assigning admins:', error);
    throw error;
  }
};

// Get admins assigned to a founder
const getAssignedAdmins = async (founderId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `/api/v1/assignments?founderId=${founderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching assigned admins:', error);
    throw error;
  }
};

// Get founders assigned to an admin
const getAssignedFounders = async (adminId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(
      `/api/v1/assignments/founders?adminId=${adminId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching assigned founders:', error);
    throw error;
  }
};

// Delete a specific assignment
const deleteAssignment = async (adminId, founderId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.delete(
      `/api/v1/assignments/${adminId}/${founderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
};
```

## Testing

When testing this API, consider the following scenarios:

1. **Assigning non-admin users**: Should return a 400 error
2. **Assigning to non-existent founder**: Should return a 404 error
3. **Duplicate prevention**: The system automatically handles this by replacing existing assignments
4. **Replacing existing assignments**: When using the POST endpoint to assign admins to a founder, all previous admin assignments for that founder are removed and replaced with the new list

## Notes

- The assignment system uses a compound index on `{founderId, adminId}` to prevent duplicate assignments
- When new assignments are made, all existing assignments for that founder are removed and replaced with the new ones
- The system logs all assignment activities for audit purposes
