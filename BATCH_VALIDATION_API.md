# Enhanced Batch Validation & Database Interface API

## Overview
This document describes the enhanced batch validation system that works with real-time student data and provides comprehensive database access for all certificates.

## Features
- ✅ **Real-time Batch Validation** - Validate multiple certificates with live data
- ✅ **Student Details Integration** - Match certificates against actual student records
- ✅ **Advanced Filtering** - Filter by institute, date range, course, student
- ✅ **Comprehensive Database Interface** - Access all certificates with pagination
- ✅ **Export Functionality** - Export data in JSON and CSV formats
- ✅ **Real-time Analytics** - Live statistics and insights
- ✅ **Real-time Updates** - WebSocket integration for live updates

## API Endpoints

### 1. Enhanced Batch Validation
**POST** `/api/certificates/bulk-validate`

Validates multiple certificates using various methods with real-time data integration.

#### Request Body Options

##### Method 1: Validate by UUIDs
```json
{
  "uuids": [
    "cert-uuid-1",
    "cert-uuid-2",
    "cert-uuid-3"
  ]
}
```

##### Method 2: Validate by Student Details
```json
{
  "studentDetails": [
    {
      "name": "John Doe",
      "course": "Computer Science",
      "institute": "MIT"
    },
    {
      "name": "Jane Smith",
      "course": "Data Science",
      "institute": "Stanford"
    }
  ]
}
```

##### Method 3: Validate by Filters
```json
{
  "instituteFilter": "MIT",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  }
}
```

#### Response
```json
{
  "success": true,
  "results": [
    {
      "uuid": "cert-uuid-1",
      "valid": true,
      "certificate": {
        "id": "cert_id",
        "student": "John Doe",
        "course": "Computer Science",
        "institute": "MIT",
        "date": "2024-01-15",
        "status": "issued",
        "issued": true,
        "generatedByAdmin": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "metadata": {
          "studentEmail": "john@example.com",
          "studentPhone": "+1234567890",
          "courseDuration": "4 years",
          "grade": "A+",
          "instructor": "Dr. Smith"
        },
        "customizations": {
          "backgroundColor": "#fffbe6",
          "logo": "mit-logo.png",
          "signature1": "Dean Signature",
          "signature2": "Registrar Signature",
          "template": "premium"
        },
        "validationCount": 5,
        "lastValidated": "2024-01-20T14:30:00Z",
        "isExpired": false
      },
      "realTimeData": {
        "validationHistory": [
          {
            "validatedAt": "2024-01-20T14:30:00Z",
            "validatedBy": "admin@example.com",
            "ipAddress": "192.168.1.1",
            "userAgent": "Mozilla/5.0..."
          }
        ],
        "qrCode": {
          "data": "https://validate.example.com/cert-uuid-1",
          "image": "base64_qr_image"
        },
        "blockchain": {
          "txId": "0x1234567890abcdef",
          "network": "ethereum",
          "anchoredAt": "2024-01-15T10:30:00Z"
        },
        "instituteDetails": {
          "name": "MIT",
          "email": "admin@mit.edu",
          "contact": "+1-617-253-1000",
          "location": "Cambridge, MA",
          "type": "university"
        }
      }
    }
  ],
  "analytics": {
    "totalCertificates": 3,
    "validCertificates": 2,
    "invalidCertificates": 1,
    "successRate": "66.67",
    "byInstitute": {
      "MIT": 1,
      "Stanford": 1
    },
    "byStatus": {
      "issued": 2,
      "pending": 0,
      "expired": 0,
      "revoked": 0
    },
    "byDateRange": {
      "2024-01-15": 1,
      "2024-01-16": 1
    }
  },
  "summary": {
    "total": 3,
    "valid": 2,
    "invalid": 1,
    "successRate": "66.67",
    "processedAt": "2024-01-20T15:00:00Z"
  },
  "filters": {
    "instituteFilter": null,
    "dateRange": null,
    "studentDetailsCount": 0
  }
}
```

### 2. Database Interface
**GET** `/api/certificates/database`

Access all certificates with advanced filtering, pagination, and search capabilities.

#### Query Parameters
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 50)
- `search` (string): Text search across all fields
- `institute` (string): Filter by institute name
- `course` (string): Filter by course name
- `student` (string): Filter by student name
- `status` (string): Filter by status (issued, pending, expired, revoked)
- `startDate` (string): Start date filter (ISO format)
- `endDate` (string): End date filter (ISO format)
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order (asc/desc, default: desc)

#### Example Request
```
GET /api/certificates/database?page=1&limit=20&search=MIT&status=issued&sortBy=createdAt&sortOrder=desc
```

#### Response
```json
{
  "success": true,
  "data": {
    "certificates": [
      {
        "id": "cert_id",
        "uuid": "cert-uuid-1",
        "student": "John Doe",
        "course": "Computer Science",
        "institute": "MIT",
        "date": "2024-01-15",
        "status": "issued",
        "issued": true,
        "generatedByAdmin": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "metadata": {
          "studentEmail": "john@example.com",
          "studentPhone": "+1234567890",
          "courseDuration": "4 years",
          "grade": "A+",
          "instructor": "Dr. Smith"
        },
        "customizations": {
          "backgroundColor": "#fffbe6",
          "logo": "mit-logo.png",
          "signature1": "Dean Signature",
          "signature2": "Registrar Signature",
          "template": "premium"
        },
        "validationCount": 5,
        "lastValidated": "2024-01-20T14:30:00Z",
        "isExpired": false,
        "qrCode": {
          "data": "https://validate.example.com/cert-uuid-1",
          "image": "base64_qr_image"
        },
        "blockchain": {
          "txId": "0x1234567890abcdef",
          "network": "ethereum",
          "anchoredAt": "2024-01-15T10:30:00Z"
        },
        "instituteDetails": {
          "name": "MIT",
          "email": "admin@mit.edu",
          "contact": "+1-617-253-1000",
          "location": "Cambridge, MA",
          "type": "university"
        },
        "validationHistory": [
          {
            "validatedAt": "2024-01-20T14:30:00Z",
            "validatedBy": "admin@example.com",
            "ipAddress": "192.168.1.1",
            "userAgent": "Mozilla/5.0..."
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 100,
      "limit": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "analytics": {
      "totalCertificates": 100,
      "uniqueInstitutes": 15,
      "uniqueCourses": 25,
      "uniqueStudents": 80,
      "avgValidationCount": 3.5,
      "statusBreakdown": {
        "issued": 85,
        "pending": 10,
        "expired": 3,
        "revoked": 2
      }
    },
    "filters": {
      "search": "MIT",
      "institute": null,
      "course": null,
      "student": null,
      "status": "issued",
      "startDate": null,
      "endDate": null,
      "sortBy": "createdAt",
      "sortOrder": "desc"
    },
    "queryTime": "2024-01-20T15:00:00Z"
  }
}
```

### 3. Export Data
**POST** `/api/certificates/export`

Export certificate data in various formats.

#### Request Body
```json
{
  "format": "json", // or "csv"
  "filters": {
    "institute": "MIT",
    "course": "Computer Science",
    "student": "John",
    "status": "issued",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

#### Response
- **JSON Format**: Returns JSON data with all certificate information
- **CSV Format**: Returns CSV file download with certificate data

### 4. Certificate Statistics
**GET** `/api/certificates/stats`

Get comprehensive statistics about certificates.

#### Query Parameters
- `startDate` (string): Start date for statistics
- `endDate` (string): End date for statistics
- `institute` (string): Filter by institute

#### Response
```json
{
  "totalCertificates": 1000,
  "totalInstitutes": 25,
  "certificatesByMonth": [
    {
      "_id": { "year": 2024, "month": 1 },
      "count": 150
    }
  ],
  "topInstitutes": [
    {
      "_id": "MIT",
      "count": 200,
      "revenue": 50000
    }
  ],
  "courseDistribution": [
    {
      "_id": "Computer Science",
      "count": 300
    }
  ]
}
```

## Real-time Features

### WebSocket Events

#### Client Connection
```javascript
const socket = io();
```

#### Events Emitted by Server
- `bulk:validation:completed` - When batch validation completes
- `database:query:completed` - When database query completes
- `certificate:created` - When new certificate is created
- `certificate:updated` - When certificate is updated
- `certificate:deleted` - When certificate is deleted

#### Example WebSocket Usage
```javascript
socket.on('bulk:validation:completed', (data) => {
  console.log('Batch validation completed:', data);
  // Update UI with results
});

socket.on('database:query:completed', (data) => {
  console.log('Database query completed:', data);
  // Update pagination info
});
```

## Frontend Interface

### Batch Validation Interface
Access the enhanced batch validation interface at:
```
http://localhost:5000/batch-validation.html
```

#### Features
- **Multiple Validation Methods**:
  - Validate by UUIDs
  - Validate by Student Details
  - Validate by Filters
- **Real-time Results**: Live updates during validation
- **Comprehensive Analytics**: Success rates, institute breakdowns
- **Export Capabilities**: Download results in various formats

### Database Interface Features
- **Advanced Search**: Text search across all fields
- **Multiple Filters**: Institute, course, student, status, date range
- **Sorting Options**: Sort by any field in ascending/descending order
- **Pagination**: Navigate through large datasets
- **Real-time Updates**: Live data updates via WebSocket
- **Export Functionality**: Export filtered data

## Usage Examples

### 1. Validate Certificates by UUIDs
```javascript
const response = await fetch('/api/certificates/bulk-validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uuids: ['cert-uuid-1', 'cert-uuid-2', 'cert-uuid-3']
  })
});
const data = await response.json();
console.log('Validation results:', data.results);
```

### 2. Search Certificates in Database
```javascript
const response = await fetch('/api/certificates/database?search=MIT&status=issued&limit=10');
const data = await response.json();
console.log('Search results:', data.data.certificates);
```

### 3. Export Certificate Data
```javascript
const response = await fetch('/api/certificates/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    format: 'csv',
    filters: { institute: 'MIT', status: 'issued' }
  })
});
const blob = await response.blob();
// Download the CSV file
```

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

## Security Considerations

- All endpoints require authentication
- Input validation on all parameters
- Rate limiting on bulk operations
- Secure data transmission
- Access logging for audit trails

## Performance Considerations

- Pagination for large datasets
- Indexed database queries
- Caching for frequently accessed data
- Real-time updates via WebSocket
- Optimized aggregation pipelines

## Integration Notes

- Compatible with existing certificate system
- Real-time data synchronization
- WebSocket integration for live updates
- Export functionality for data portability
- Comprehensive analytics and reporting
