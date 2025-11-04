# MyHome API - Postman Collection

This directory contains Postman collections and documentation for the MyHome Healthcare Management System API.

## 📁 Files

- **`MyHome_API_Collection.postman_collection.json`** - Complete Postman collection with all API endpoints
- **`MyHome_API_Environment.postman_environment.json`** - Environment variables for Postman
- **`API_DOCUMENTATION.md`** - Comprehensive API documentation

## 🚀 Quick Start

### 1. Import into Postman

1. Open Postman
2. Click **Import** button (top left)
3. Select both files:
   - `MyHome_API_Collection.postman_collection.json`
   - `MyHome_API_Environment.postman_environment.json`
4. Select the **"MyHome API - Local"** environment from the dropdown

### 2. Configure Environment Variables

The environment includes these variables:
- `base_url`: `http://localhost:3005` (default)
- `access_token`: Auto-populated after login
- `refresh_token`: Auto-populated after login
- `facility_id`: Set manually for testing
- `resident_id`: Set manually for testing
- `doctor_id`: Set manually for testing
- `user_id`: Set manually for testing
- `document_id`: Set manually for testing (after uploading a document)

### 3. Start Testing

1. **Login First**: Run the "Login" request in the Authentication folder
   - The tokens will automatically be saved to environment variables
   - All subsequent requests will use the saved token

2. **Test Endpoints**: Navigate through the collection folders to test different endpoints

## 📋 Collection Structure

### Authentication
- Register User
- Login (auto-saves tokens)
- Refresh Token
- Get Profile
- Logout

### Residents (Comprehensive)
- Get All Residents (with pagination, filtering, search)
- Get Resident by ID
- Get Available Physicians
- Get Residents Statistics
- Create Resident
- Update Resident
- Delete Resident (Soft Delete)

### Facilities
- Get All Facilities
- Get Facility by ID
- Create Facility

### Facility Access
- Get User Accessible Facilities

### Documents
- Upload Document (multipart/form-data)
- Get All Documents
- Get Resident Documents
- Get Document by ID
- Download Document
- Get Documents by Category
- Get Expiring Documents
- Update Document
- Delete Document

### Medications
- Get All Medications
- Get Medication Statistics
- Create Medication

### Care Plans
- Get All Care Plans
- Create Care Plan

### Schedules
- Get All Schedules
- Create Schedule

## 🔧 Environment Setup

### Local Development
```
base_url: http://localhost:3005
```

### Production (when ready)
```
base_url: https://your-production-domain.com
```

## 📝 Usage Tips

1. **Auto Token Management**: The Login request automatically saves tokens. No need to manually copy/paste.

2. **Variable Substitution**: Use `{{variable_name}}` in requests:
   - `{{base_url}}` - Base API URL
   - `{{access_token}}` - JWT access token
   - `{{facility_id}}` - Facility UUID for testing
   - `{{resident_id}}` - Resident UUID for testing

3. **Test Scripts**: The Login request includes a test script that automatically saves tokens to the environment.

4. **Role Testing**: Create different users with different roles to test role-based access control:
   - Admin: Full access
   - Supervisor: Facility owner access
   - Doctor: Read/update access
   - Caregiver: Read-only access

## 🔐 Authentication Flow

1. **Register** (Admin only) or use existing user
2. **Login** - Gets tokens automatically
3. Tokens are saved to environment variables
4. All subsequent requests use `Bearer {{access_token}}`
5. **Refresh Token** when access token expires
6. **Logout** when done

## 📊 Testing Workflow

1. Start backend server: `npm run dev` (from backend directory)
2. Import Postman collection and environment
3. Run Login request
4. Test Create Resident endpoint
5. Test Get All Residents (verify the created resident appears)
6. Test Get Resident by ID (use resident ID from previous response)
7. Test Update Resident
8. Test Delete Resident (admin only)
9. Test other endpoints as needed

## 🎯 Key Features

- **Automatic Token Management**: Login saves tokens automatically
- **Comprehensive Coverage**: All major endpoints included
- **Role-Based Examples**: Different access levels documented
- **Environment Variables**: Easy switching between local/production
- **Error Handling**: Examples of error responses
- **Validation**: Request body examples with validation rules

## 📚 Additional Documentation

See `API_DOCUMENTATION.md` for detailed endpoint documentation, including:
- Request/response examples
- Validation rules
- Error codes
- Role-based access control
- Field descriptions

## 🐛 Troubleshooting

### Tokens Not Saving
- Ensure you've selected the correct environment in Postman
- Check that the Login request's test script is enabled

### 401 Unauthorized
- Run Login request again to refresh tokens
- Check that Authorization header is set correctly

### 403 Forbidden
- Verify user role has permission for the endpoint
- Check facility access for non-admin users

### Connection Errors
- Ensure backend server is running on `http://localhost:3005`
- Verify `base_url` in environment is correct

