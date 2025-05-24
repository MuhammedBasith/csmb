# Dashboard API Documentation

This document provides details about the Dashboard APIs available for the Super Admin dashboard in the Blowlin platform.

## Base URL

All API endpoints are prefixed with: `/api/v1/dashboard`

## Authentication

All dashboard endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Get Main Dashboard Statistics

Retrieves the main statistics for the dashboard, including active founders, posts, engagement metrics, and admin performance.

**Endpoint:** `GET /api/v1/dashboard/stats`

**Access:** Super Admin only

**Response Example:**
```json
{
  "success": true,
  "stats": {
    "totalActiveFounders": {
      "count": 25,
      "trend": 3
    },
    "totalPostsPublished": {
      "count": 120,
      "trend": 15,
      "prevMonth": 105
    },
    "overallEngagement": {
      "impressions": 250000,
      "commentOutreach": 3200,
      "formattedImpressions": "250.0K"
    },
    "adminPerformance": {
      "activeAdmins": 5,
      "totalAdmins": 8,
      "percentageFoundersUpdated": 80
    }
  }
}
```

### 2. Get Recent Activities

Retrieves recent activities data for the dashboard, including latest metrics uploads, top performing founders, admins requiring attention, and upcoming milestones.

**Endpoint:** `GET /api/v1/dashboard/activities`

**Access:** Super Admin only

**Response Example:**
```json
{
  "success": true,
  "activities": {
    "latestMetricsUploads": [
      {
        "id": "60d21b4667d0d8992e610c85",
        "adminName": "John Doe",
        "founderName": "Jane Smith",
        "companyName": "Tech Innovations",
        "month": "2025-05",
        "timestamp": "2025-05-23T14:30:45.123Z"
      }
    ],
    "topPerformingFounders": [
      {
        "id": "60d21b4667d0d8992e610c86",
        "founderName": "Alex Johnson",
        "companyName": "Growth Hackers",
        "industry": "Marketing",
        "impressions": 85000,
        "formattedImpressions": "85.0K",
        "posts": 25
      }
    ],
    "adminsRequiringAttention": [
      {
        "id": "60d21b4667d0d8992e610c87",
        "name": "Michael Brown",
        "email": "michael@example.com",
        "assignedFoundersCount": 5,
        "lastUploadDate": null
      }
    ],
    "upcomingMilestones": [
      {
        "id": "60d21b4667d0d8992e610c88",
        "founderName": "Sarah Wilson",
        "companyName": "Digital Solutions",
        "currentPosts": 95,
        "milestone": 100,
        "postsAway": 5
      }
    ]
  }
}
```

### 3. Get Graph Data

Retrieves data for various graphs on the dashboard, including platform-wide growth trends, admin activity comparison, founder distribution by industry, and metrics completion rate.

**Endpoint:** `GET /api/v1/dashboard/graphs`

**Access:** Super Admin only

**Response Example:**
```json
{
  "success": true,
  "graphData": {
    "platformGrowthTrends": [
      {
        "month": "2024-06",
        "totalPosts": 80,
        "totalImpressions": 180000,
        "totalCommentOutreach": 2500,
        "metricsCount": 20
      },
      {
        "month": "2024-07",
        "totalPosts": 95,
        "totalImpressions": 210000,
        "totalCommentOutreach": 2800,
        "metricsCount": 22
      }
    ],
    "adminActivity": [
      {
        "adminId": "60d21b4667d0d8992e610c89",
        "adminName": "John Doe",
        "monthlyActivity": [
          {
            "month": "2024-06",
            "uploadsCount": 8
          },
          {
            "month": "2024-07",
            "uploadsCount": 10
          }
        ]
      }
    ],
    "industryDistribution": [
      {
        "industry": "Technology",
        "count": 12
      },
      {
        "industry": "Marketing",
        "count": 8
      },
      {
        "industry": "Finance",
        "count": 5
      }
    ],
    "metricsCompletionRate": [
      {
        "month": "2024-06",
        "completionRate": 75
      },
      {
        "month": "2024-07",
        "completionRate": 80
      }
    ]
  }
}
```

### 4. Get All Dashboard Data

Retrieves all dashboard data in a single request, combining the responses from the three endpoints above.

**Endpoint:** `GET /api/v1/dashboard/all`

**Access:** Super Admin only

**Response Example:**
```json
{
  "success": true,
  "dashboard": {
    "mainStats": {
      // Same as the response from GET /api/v1/dashboard/stats
    },
    "recentActivities": {
      // Same as the response from GET /api/v1/dashboard/activities
    },
    "graphData": {
      // Same as the response from GET /api/v1/dashboard/graphs
    }
  }
}
```

## Error Responses

All endpoints return a standard error format:

```json
{
  "status": "error",
  "statusCode": 403,
  "message": "Only super admins can access this endpoint"
}
```

Common error codes:
- `401`: Not authenticated
- `403`: Not authorized (not a super admin)
- `500`: Server error
