# Admin Dashboard API Documentation

This document provides details about the Admin Dashboard APIs available for admin users in the Blowlin platform.

## Base URL

All API endpoints are prefixed with: `/api/v1/admin-dashboard`

## Authentication

All admin dashboard endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Access Control

These endpoints are only accessible to users with the `admin` role. Super admins and founders cannot access these endpoints.

## Endpoints

### 1. Get Admin Dashboard Statistics

Retrieves the main statistics for the admin dashboard, including assigned founders count, metrics completion rate, average founder performance, and metrics needing attention.

**Endpoint:** `GET /api/v1/admin-dashboard/stats`

**Access:** Admin only

**Response Example:**
```json
{
  "success": true,
  "stats": {
    "assignedFoundersCount": {
      "count": 8,
      "totalActiveFounders": 25,
      "percentage": 32
    },
    "metricsCompletionRate": {
      "percentage": 75,
      "completedCount": 6,
      "totalAssigned": 8
    },
    "averageFounderPerformance": {
      "impressions": 45000,
      "engagement": 2800,
      "formattedImpressions": "45.0K",
      "formattedEngagement": "2.8K"
    },
    "metricsNeedingAttention": {
      "count": 2,
      "percentage": 25
    }
  }
}
```

### 2. Get Admin Recent Activities

Retrieves recent activities data for the admin dashboard, including latest metrics uploads, performance highlights, upcoming deadlines, and system updates.

**Endpoint:** `GET /api/v1/admin-dashboard/activities`

**Access:** Admin only

**Response Example:**
```json
{
  "success": true,
  "activities": {
    "latestMetricsUploads": [
      {
        "id": "60d21b4667d0d8992e610c85",
        "founderName": "Jane Smith",
        "companyName": "Tech Innovations",
        "month": "2025-05",
        "impressions": 65000,
        "formattedImpressions": "65.0K",
        "timestamp": "2025-05-23T14:30:45.123Z"
      }
    ],
    "performanceHighlights": [
      {
        "id": "60d21b4667d0d8992e610c86",
        "founderName": "Alex Johnson",
        "companyName": "Growth Hackers",
        "impressionsGrowth": 35,
        "engagementGrowth": 42,
        "month": "2025-05"
      }
    ],
    "upcomingDeadlines": [
      {
        "id": "60d21b4667d0d8992e610c87",
        "founderName": "Michael Brown",
        "companyName": "Digital Solutions",
        "month": "2025-05",
        "daysLeft": 7
      }
    ],
    "systemUpdates": [
      {
        "id": "1",
        "title": "New Metrics Dashboard",
        "description": "We've updated the metrics dashboard with new visualizations",
        "date": "2025-05-17T10:30:00.000Z"
      }
    ]
  }
}
```

### 3. Get Admin Graph Data

Retrieves data for various graphs on the admin dashboard, including metrics update frequency, founder performance comparison, metrics trends over time, and admin activity timeline.

**Endpoint:** `GET /api/v1/admin-dashboard/graphs`

**Access:** Admin only

**Response Example:**
```json
{
  "success": true,
  "graphData": {
    "metricsUpdateFrequency": [
      {
        "founderId": "60d21b4667d0d8992e610c88",
        "founderName": "Sarah Wilson",
        "companyName": "Digital Solutions",
        "monthlyUpdates": [
          {
            "month": "2024-06",
            "updatesCount": 1
          },
          {
            "month": "2024-07",
            "updatesCount": 1
          }
        ]
      }
    ],
    "founderPerformanceComparison": [
      {
        "founderId": "60d21b4667d0d8992e610c89",
        "founderName": "John Doe",
        "companyName": "Tech Startup",
        "impressions": 85000,
        "engagement": 3200,
        "posts": 15
      }
    ],
    "metricsTrends": [
      {
        "month": "2024-06",
        "totalImpressions": 180000,
        "totalEngagement": 7500,
        "totalPosts": 45,
        "metricsCount": 5,
        "avgImpressions": 36000,
        "avgEngagement": 1500,
        "avgPosts": 9
      }
    ],
    "adminActivityTimeline": [
      {
        "id": "60d21b4667d0d8992e610c90",
        "type": "metrics_upload",
        "founderName": "Jane Smith",
        "companyName": "Tech Innovations",
        "month": "2025-05",
        "timestamp": "2025-05-23T14:30:45.123Z"
      }
    ]
  }
}
```

### 4. Get All Admin Dashboard Data

Retrieves all admin dashboard data in a single request, combining the responses from the three endpoints above.

**Endpoint:** `GET /api/v1/admin-dashboard/all`

**Access:** Admin only

**Response Example:**
```json
{
  "success": true,
  "dashboard": {
    "stats": {
      // Same as the response from GET /api/v1/admin-dashboard/stats
    },
    "activities": {
      // Same as the response from GET /api/v1/admin-dashboard/activities
    },
    "graphData": {
      // Same as the response from GET /api/v1/admin-dashboard/graphs
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
  "message": "Only admins can access this endpoint"
}
```

Common error codes:
- `401`: Not authenticated
- `403`: Not authorized (not an admin)
- `500`: Server error
