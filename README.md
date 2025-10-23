# MyHome Healthcare API

A comprehensive Node.js Express API designed for healthcare facilities with PostgreSQL database connection, role-based authentication, and facility management system.

## Features

- 🔐 **JWT Authentication** with access and refresh tokens
- 👥 **Healthcare Role-based Authorization** (Admin, Caregiver, Doctor, Supervisor)
- 🏥 **Facility Management** system for healthcare centers
- 🗄️ **PostgreSQL Database** with connection pooling
- 🛡️ **Advanced Security** (Account lockout, password policies, rate limiting)
- ✅ **Input Validation** with healthcare-specific requirements
- 📝 **Comprehensive Error Handling**
- 🔄 **Database Migrations** and seeding
- 📊 **User Profile Management** with healthcare fields
- 🔒 **Password Reset** functionality
- 🚫 **Account Lockout** protection against brute force attacks

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet, cors
- **Validation**: express-validator
- **Environment**: dotenv

## Project Structure

```
src/
├── config/
│   ├── config.js          # Application configuration
│   └── database.js        # Database connection
├── controllers/
│   ├── authController.js  # Authentication logic
│   └── userController.js  # User management logic
├── database/
│   ├── migrate.js         # Database migrations
│   └── seed.js           # Database seeding
├── middleware/
│   ├── auth.js           # Authentication middleware
│   ├── errorHandler.js   # Error handling
│   └── validation.js     # Input validation
├── routes/
│   ├── auth.js           # Authentication routes
│   └── users.js          # User management routes
└── server.js             # Main server file
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MyHome
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   **Option A: Cloud PostgreSQL (Recommended)**
   ```bash
   # For development with placeholder values
   node setup-cloud-db.js
   
   # For production with real credentials (create this file locally)
   # node setup-actual-cloud-db.js
   ```
   
   **Option B: Local PostgreSQL**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=myhome_db
   DB_USER=postgres
   DB_PASSWORD=your_password_here

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d
   ```

4. **Set up PostgreSQL database**
   
   **Cloud Database (Already configured):**
   - Using Aiven cloud PostgreSQL service
   - SSL connection enabled
   - Database: `core-db`
   
   **Local Database:**
   - Install PostgreSQL
   - Create a database named `myhome_db`
   - Update database credentials in `.env`

5. **Run database migrations**
   ```bash
   npm run migrate up
   ```

6. **Seed the database with test data**
   ```bash
   npm run seed seed
   ```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Database Operations
```bash
# Run migrations
npm run migrate up

# Rollback migrations
npm run migrate down

# Seed database
npm run seed seed

# Clear database
npm run seed clear
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (Admin only)
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/profile` - Get current user profile

### User Management
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Admin or self)
- `PUT /api/users/:id` - Update user profile (Admin or self)
- `PUT /api/users/:id/password` - Change password (Self only)
- `PUT /api/users/:id/role` - Update user role (Admin only)
- `PUT /api/users/:id/deactivate` - Deactivate user (Admin only)
- `PUT /api/users/:id/activate` - Activate user (Admin only)

### Facility Management
- `GET /api/facilities` - Get all facilities (Admin/Supervisor only)
- `GET /api/facilities/:id` - Get facility by ID (Admin/Supervisor only)
- `POST /api/facilities` - Create facility (Admin only)
- `PUT /api/facilities/:id` - Update facility (Admin only)
- `PUT /api/facilities/:id/deactivate` - Deactivate facility (Admin only)
- `PUT /api/facilities/:id/activate` - Activate facility (Admin only)

## Authentication

The API uses JWT tokens for authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Healthcare User Roles

- **Admin**: Full access to all endpoints, can manage users and facilities
- **Supervisor**: Can view reports, audit logs, and users; cannot modify data
- **Doctor**: Can prescribe medications, view residents, update medical records
- **Caregiver**: Can view assigned residents, update daily logs, mark medication administration

## Test Accounts

After seeding the database, you can use these healthcare test accounts:

- **Admin**: `admin@myhome.com` / `Admin123!`
- **Caregiver 1**: `caregiver1@myhome.com` / `Caregiver123!`
- **Caregiver 2**: `caregiver2@myhome.com` / `Caregiver123!`
- **Doctor**: `doctor@myhome.com` / `Doctor123!`
- **Supervisor**: `supervisor@myhome.com` / `Supervisor123!`

**Facility**: Greenville Healthcare Center

## API Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    // Validation errors (if any)
  ]
}
```

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure token-based authentication with 1-hour expiration
- **Account Lockout**: 5 failed attempts locks account for 30 minutes
- **Password Policy**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Rate Limiting**: Prevents abuse (100 requests per 15 minutes)
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security headers
- **Input Validation**: Healthcare-specific request validation
- **SQL Injection Protection**: Parameterized queries
- **Password Reset**: Secure token-based password recovery
- **Role-based Access Control**: Granular permissions for healthcare roles

## 🔒 Security Best Practices

### Environment Variables
- **Never commit real secrets to GitHub**
- All sensitive data uses environment variables
- `.env` files are in `.gitignore`
- Use `env.example` for template values only

### GitHub Secret Scanning
This project is configured to avoid GitHub's secret scanning issues:

- ✅ No hardcoded secrets in source code
- ✅ All credentials use environment variables
- ✅ Example files use placeholder values
- ✅ Real credentials in separate, ignored files

### Setting Up Real Credentials
1. Copy `setup-actual-cloud-db.js` (create locally)
2. Add your real database credentials to the file
3. Run `node setup-actual-cloud-db.js` to generate `.env`
4. The file with real credentials is in `.gitignore`

## Development

### Adding New Routes

1. Create controller in `src/controllers/`
2. Create route file in `src/routes/`
3. Add route to `src/server.js`
4. Add appropriate middleware for authentication/authorization

### Database Changes

1. Update migration in `src/database/migrate.js`
2. Run `npm run migrate up`
3. Update seed data if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
