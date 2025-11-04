# MyHome Healthcare API Documentation

## Base URL
```
http://localhost:3005/api
```

## Authentication

All API endpoints (except registration and login) require authentication using JWT Bearer tokens.

### Headers
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## 🏥 Residents API

### Get All Residents
**GET** `/residents`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status (`active`, `inactive`, `discharged`)
- `search` (optional): Search by firstName, lastName, or roomNumber

**Access:** Admin, Supervisor, Doctor, Caregiver

**Response:**
```json
{
  "success": true,
  "data": {
    "residents": [
      {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "dob": "1950-01-15",
        "gender": "male",
        "facilityId": "uuid",
        "roomNumber": "101",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

---

### Get Resident by ID
**GET** `/residents/:id`

**Path Parameters:**
- `id` (required): Resident UUID

**Access:** Admin, Supervisor, Doctor, Caregiver

**Response:**
```json
{
  "success": true,
  "data": {
    "resident": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "dob": "1950-01-15",
      "gender": "male",
      "photoUrl": "https://example.com/photo.jpg",
      "admissionDate": "2024-01-01",
      "dischargeDate": null,
      "roomNumber": "101",
      "facilityId": "uuid",
      "primaryPhysician": "uuid",
      "emergencyContactName": "Jane Doe",
      "emergencyContactPhone": "555-1234",
      "diagnosis": "Hypertension",
      "allergies": "Peanuts",
      "dietaryRestrictions": "Low sodium",
      "mobilityLevel": "assisted",
      "careLevel": "assisted_living",
      "insuranceProvider": "Test Insurance",
      "policyNumber": "POL-12345",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### Get Available Physicians
**GET** `/residents/physicians`

**Access:** Admin, Supervisor, Doctor

**Description:** Returns list of available doctors for primary physician selection. Non-admin users see only doctors from their facility.

**Response:**
```json
{
  "success": true,
  "data": {
    "physicians": [
      {
        "id": "uuid",
        "name": "Dr. Smith",
        "email": "dr.smith@example.com",
        "role": "doctor"
      }
    ]
  }
}
```

---

### Get Residents Statistics
**GET** `/residents/stats`

**Access:** Admin, Supervisor

**Response:**
```json
{
  "success": true,
  "data": {
    "totalResidents": 50,
    "activeResidents": 45,
    "inactiveResidents": 3,
    "dischargedResidents": 2
  }
}
```

---

### Create Resident
**POST** `/residents`

**Access:** Admin, Supervisor

**Request Body:**
```json
{
  "firstName": "John",                    // Required
  "lastName": "Doe",                      // Required
  "facilityId": "uuid",                   // Required (foreign key)
  "dob": "1950-01-15",                    // Optional (YYYY-MM-DD)
  "gender": "male",                       // Optional: "male", "female", "other"
  "photoUrl": "https://example.com/photo.jpg",  // Optional
  "admissionDate": "2024-01-01",          // Optional (ISO date)
  "dischargeDate": null,                  // Optional (ISO date, must be >= admissionDate)
  "roomNumber": "101",                    // Optional
  "primaryPhysician": "uuid",             // Optional (UUID of doctor user)
  "emergencyContactName": "Jane Doe",     // Optional
  "emergencyContactPhone": "555-1234",   // Optional
  "diagnosis": "Hypertension",           // Optional
  "allergies": "Peanuts",                 // Optional
  "dietaryRestrictions": "Low sodium",    // Optional
  "mobilityLevel": "assisted",            // Optional: "independent", "assisted", "wheelchair", "bedridden"
  "careLevel": "assisted_living",         // Optional: "independent", "assisted_living", "memory_care", "skilled_nursing", "hospice"
  "insuranceProvider": "Test Insurance", // Optional
  "policyNumber": "POL-12345",           // Optional
  "status": "active"                      // Optional: "active", "inactive", "discharged" (default: "active")
}
```

**Response:**
```json
{
  "success": true,
  "message": "Resident created successfully",
  "data": {
    "resident": { /* resident object */ }
  }
}
```

**Validation Rules:**
- `firstName` and `lastName` are required
- `facilityId` is required and must be a valid UUID
- `primaryPhysician` must be a valid UUID if provided
- `dischargeDate` must be >= `admissionDate` if both provided
- Dates must be in ISO 8601 format
- ENUM fields must match allowed values

---

### Update Resident
**PUT** `/residents/:id`

**Path Parameters:**
- `id` (required): Resident UUID

**Access:** Admin, Supervisor, Doctor

**Request Body:** (Only include fields you want to update)
```json
{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "roomNumber": "202",
  "diagnosis": "Updated diagnosis",
  "facilityId": "new-facility-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Resident updated successfully",
  "data": {
    "resident": { /* updated resident object */ }
  }
}
```

---

### Delete Resident (Soft Delete)
**DELETE** `/residents/:id`

**Path Parameters:**
- `id` (required): Resident UUID

**Access:** Admin only

**Description:** Soft deletes the resident (sets `deletedAt` timestamp). Record is hidden but not permanently deleted.

**Response:**
```json
{
  "success": true,
  "message": "Resident deleted successfully (soft delete)"
}
```

---

## 🔐 Authentication API

### Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@#",
  "name": "User Name",
  "role": "admin",  // "admin", "supervisor", "doctor", "caregiver"
  "facilityId": "uuid"  // Optional (required for doctor, caregiver)
}
```

---

### Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@#"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "admin",
      "facilityId": "uuid"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token"
    }
  }
}
```

---

### Refresh Token
**POST** `/auth/refresh`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

---

### Get Profile
**GET** `/auth/profile`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "admin",
      "facilityId": "uuid",
      "isActive": true,
      "emailVerified": true
    }
  }
}
```

---

### Logout
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer {access_token}
```

---

## 🏢 Facilities API

### Get All Facilities
**GET** `/facilities`

**Access:** Admin, Supervisor

---

### Get Facility by ID
**GET** `/facilities/:id`

**Access:** Admin, Supervisor

---

### Create Facility
**POST** `/facilities`

**Access:** Admin

**Request Body:**
```json
{
  "name": "Healthcare Facility",
  "address": "123 Main St",
  "phone": "555-1234",
  "email": "facility@example.com"
}
```

---

## 🔑 Facility Access API

### Get User Accessible Facilities
**GET** `/facility-access/user/:userId/facilities`

**Path Parameters:**
- `userId` (required): User UUID

**Access:** Admin, Supervisor, Doctor, Caregiver

**Description:** Returns facilities accessible to the user based on their role:
- **Admin:** All active facilities
- **Supervisor:** Owned facilities
- **Doctor:** All active facilities (for selection)
- **Caregiver:** Assigned facility only

**Response:**
```json
{
  "success": true,
  "data": {
    "facilities": [
      {
        "id": "uuid",
        "name": "Healthcare Facility",
        "address": "123 Main St",
        "phone": "555-1234",
        "email": "facility@example.com",
        "capacity": 100
      }
    ],
    "userRole": "admin",
    "currentFacilityId": "uuid"
  }
}
```

---

## 💊 Medications API

### Get All Medications
**GET** `/medications`

**Access:** Admin, Supervisor, Doctor, Caregiver

---

### Get Medication Statistics
**GET** `/medications/stats`

**Access:** Admin, Supervisor

---

### Create Medication
**POST** `/medications`

**Access:** Admin, Supervisor

**Request Body:**
```json
{
  "name": "Aspirin",
  "description": "Pain reliever",
  "dosage": "100",
  "unit": "mg",
  "route": "oral",
  "frequency": "daily",
  "status": "active"
}
```

---

## 📋 Care Plans API

### Get All Care Plans
**GET** `/care-plans`

**Access:** Admin, Supervisor, Doctor, Caregiver

---

### Create Care Plan
**POST** `/care-plans`

**Access:** Admin, Supervisor, Doctor

**Request Body:**
```json
{
  "residentId": "uuid",
  "title": "Physical Therapy Plan",
  "description": "Weekly physical therapy sessions",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "status": "active"
}
```

---

## 📅 Schedules API

### Get All Schedules
**GET** `/schedules`

**Access:** Admin, Supervisor, Doctor, Caregiver

---

### Create Schedule
**POST** `/schedules`

**Access:** Admin, Supervisor, Doctor

**Request Body:**
```json
{
  "facilityId": "uuid",
  "title": "Weekly Meeting",
  "description": "Staff meeting",
  "type": "meeting",
  "startDate": "2024-01-01T10:00:00Z",
  "endDate": "2024-01-01T11:00:00Z",
  "isRecurring": true,
  "recurrencePattern": "weekly",
  "status": "active"
}
```

---

## 📄 Documents API

### Upload Document (File Upload)
**POST** `/documents`

**Access:** Admin, Supervisor

**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `file` (required): File to upload (max 10MB)
  - Allowed types: Images (JPEG, PNG, GIF, WebP), PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Text (.txt), CSV (.csv)
- `title` (required): Document title
- `description` (optional): Document description
- `category` (optional): Document category - one of: `license`, `insurance`, `compliance`, `medical`, `administrative`, `legal`, `financial` (default: `administrative`)
- `residentId` (optional): Resident UUID if document is associated with a resident
- `expiryDate` (optional): Expiry date in ISO format (YYYY-MM-DD)
- `isConfidential` (optional): Boolean, default `false`
- `tags` (optional): JSON array of tags

**Example using cURL:**
```bash
curl -X POST "http://localhost:3005/api/documents" \
  -H "Authorization: Bearer {access_token}" \
  -F "file=@/path/to/document.pdf" \
  -F "title=Medical Report" \
  -F "description=Annual medical examination report" \
  -F "category=medical" \
  -F "residentId=uuid-here" \
  -F "expiryDate=2025-12-31" \
  -F "isConfidential=false"
```

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "document": {
      "id": "uuid",
      "title": "Medical Report",
      "description": "Annual medical examination report",
      "category": "medical",
      "filePath": "uploads/documents/resident-id/file-1234567890.pdf",
      "fileName": "document.pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "facilityId": "uuid",
      "residentId": "uuid",
      "uploadedBy": "uuid",
      "expiryDate": "2025-12-31T00:00:00.000Z",
      "isConfidential": false,
      "tags": [],
      "version": "1.0",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "facility": {
        "id": "uuid",
        "name": "Healthcare Facility"
      },
      "resident": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "roomNumber": "101"
      },
      "uploader": {
        "id": "uuid",
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: File is required, File size exceeds 10MB, Invalid file type
- `400 Bad Request`: Facility ID is required
- `403 Forbidden`: Unauthorized role

---

### Get All Documents
**GET** `/documents`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `category` (optional): Filter by category
- `search` (optional): Search by title, description, or fileName

**Access:** Admin, Supervisor

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "title": "Medical Report",
        "description": "Annual medical examination report",
        "category": "medical",
        "fileName": "document.pdf",
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "facilityId": "uuid",
        "residentId": "uuid",
        "expiryDate": "2025-12-31T00:00:00.000Z",
        "isConfidential": false,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

---

### Get Documents for a Resident
**GET** `/documents/resident/:residentId`

**Path Parameters:**
- `residentId` (required): Resident UUID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `category` (optional): Filter by category
- `search` (optional): Search by title, description, or fileName

**Access:** Admin, Supervisor, Doctor, Caregiver

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "title": "Medical Report",
        "category": "medical",
        "fileName": "document.pdf",
        "expiryDate": "2025-12-31T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

---

### Get Document by ID
**GET** `/documents/:id`

**Path Parameters:**
- `id` (required): Document UUID

**Access:** Admin, Supervisor

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "uuid",
      "title": "Medical Report",
      "description": "Annual medical examination report",
      "category": "medical",
      "filePath": "uploads/documents/resident-id/file-1234567890.pdf",
      "fileName": "document.pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "facilityId": "uuid",
      "residentId": "uuid",
      "uploadedBy": "uuid",
      "expiryDate": "2025-12-31T00:00:00.000Z",
      "isConfidential": false,
      "tags": [],
      "version": "1.0",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "facility": {
        "id": "uuid",
        "name": "Healthcare Facility"
      },
      "resident": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "roomNumber": "101"
      },
      "uploader": {
        "id": "uuid",
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  }
}
```

---

### Download Document File
**GET** `/documents/:id/download`

**Path Parameters:**
- `id` (required): Document UUID

**Access:** Admin, Supervisor, Doctor, Caregiver

**Description:** Downloads the actual file. Returns file stream with appropriate Content-Type and Content-Disposition headers.

**Response:** Binary file stream

**Error Responses:**
- `404 Not Found`: Document not found or file not found on server
- `403 Forbidden`: Access denied (document belongs to different facility)

---

### Get Documents by Category
**GET** `/documents/category/:category`

**Path Parameters:**
- `category` (required): Document category - one of: `license`, `insurance`, `compliance`, `medical`, `administrative`, `legal`, `financial`

**Access:** Admin, Supervisor

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "title": "Medical Report",
        "category": "medical",
        "fileName": "document.pdf",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### Get Expiring Documents
**GET** `/documents/expiring`

**Query Parameters:**
- `days` (optional): Number of days ahead to check (default: 30)

**Access:** Admin, Supervisor

**Description:** Returns documents that will expire within the specified number of days.

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "title": "Insurance Certificate",
        "category": "insurance",
        "expiryDate": "2024-02-01T00:00:00.000Z",
        "fileName": "insurance.pdf"
      }
    ]
  }
}
```

---

### Update Document
**PUT** `/documents/:id`

**Path Parameters:**
- `id` (required): Document UUID

**Access:** Admin, Supervisor

**Request Body:**
```json
{
  "title": "Updated Document Title",
  "description": "Updated description",
  "category": "medical",
  "expiryDate": "2025-12-31",
  "isConfidential": true,
  "tags": ["urgent", "review"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document updated successfully",
  "data": {
    "document": {
      /* updated document object */
    }
  }
}
```

**Note:** This endpoint updates document metadata only. To upload a new file, delete the old document and create a new one.

---

### Delete Document
**DELETE** `/documents/:id`

**Path Parameters:**
- `id` (required): Document UUID

**Access:** Admin, Supervisor

**Description:** Deletes the document record and the associated file from the server.

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Error Responses:**
- `404 Not Found`: Document not found
- `403 Forbidden`: Access denied (document belongs to different facility)

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message",
  "errors": ["Detailed error messages"]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied: Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Role-Based Access Control

### Admin
- Full access to all endpoints
- Can manage all facilities and residents
- Can delete residents (soft delete)

### Supervisor
- Can manage residents in owned facilities
- Can create/update residents
- Cannot delete residents
- Can upload, update, and delete documents

### Doctor
- Can view and update residents
- Can see all facilities (for selection)
- Cannot create or delete residents
- Can view and download documents for residents

### Caregiver
- Can only view residents
- Limited to assigned facility only
- Cannot create, update, or delete
- Can view and download documents for residents in their facility

---

## Notes

1. **UUID Format:** All IDs must be valid UUIDs (v4 format)
2. **Dates:** Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
3. **Facility Filtering:** Non-admin users automatically see only data from their facility
4. **Soft Delete:** Deleted residents are hidden but not permanently removed
5. **Pagination:** Default page size is 10, maximum is 100
6. **Token Expiry:** Access tokens expire after 24 hours, refresh tokens after 7 days
7. **File Uploads:** Maximum file size is 10MB. Supported formats: Images (JPEG, PNG, GIF, WebP), PDF, Word, Excel, PowerPoint, Text, CSV
8. **Document Storage:** Files are stored in `uploads/documents/` with subdirectories for resident-specific documents

---

## Postman Collection

Import the Postman collection files:
- `MyHome_API_Collection.postman_collection.json` - All API endpoints
- `MyHome_API_Environment.postman_environment.json` - Environment variables

The Login endpoint automatically saves tokens to environment variables for use in subsequent requests.

