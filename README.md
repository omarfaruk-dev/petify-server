# PETIFY SERVER – Backend API for Pet Adoption & Donation Platform

![Petify Server](https://i.postimg.cc/Wp0mZQvF/petify-ui.png)

**Live API:** [https://petify-server.vercel.app](https://petify-server.vercel.app)

---

# About Petify Server

Petify Server is a robust RESTful API backend built with **Node.js, Express.js, MongoDB, Firebase Admin, and Stripe**—powering the Petify platform with secure authentication, real-time data management, payment processing, and comprehensive admin controls for pet adoption and donation campaigns.

Built with **Express.js, MongoDB, Firebase Admin SDK, Stripe API & Node.js**

## Related Repositories
- **Client-side:** [Petify Client Side Repo](https://github.com/omarfaruk-dev/petify-client)
- **Server-side:** [Petify Server Side Repo](https://github.com/omarfaruk-dev/petify-server)

## Key Features

### 🔐 **Authentication & Authorization**
- **Firebase Admin SDK Integration** - Secure token-based authentication
- **Role-Based Access Control** - User and Admin role management
- **Token Verification Middleware** - Automatic request validation
- **Admin Privilege Management** - Secure admin-only endpoints

### 🐾 **Pet Management System**
- **CRUD Operations** - Create, read, update, delete pet profiles
- **Adoption Status Tracking** - Real-time adoption status updates
- **Image Management** - Pet photo storage and retrieval
- **Search & Filtering** - Advanced pet search capabilities
- **Admin Pet Management** - Comprehensive admin controls

### 💝 **Donation Campaign System**
- **Campaign Creation & Management** - Full campaign lifecycle
- **Status Management** - Active, paused, completed campaigns
- **Donation Tracking** - Real-time donation progress
- **Admin Campaign Controls** - Campaign approval and management

### 💳 **Payment Integration**
- **Stripe Payment Gateway** - Secure payment processing
- **Payment Intent Creation** - Server-side payment security
- **Transaction Management** - Payment history and tracking
- **Donation Processing** - Automated donation handling

### 👥 **User Management**
- **User Registration & Profiles** - Complete user lifecycle
- **Role Management** - User and admin role assignment
- **User Search & Filtering** - Admin user management tools
- **Ban/Unban System** - User moderation capabilities

### 📊 **Adoption System**
- **Adoption Request Processing** - Complete adoption workflow
- **Status Tracking** - Pending, approved, rejected statuses
- **User Adoption History** - Personal adoption tracking
- **Admin Approval System** - Adoption request management

## Tech Stack & Dependencies

### **Core Framework**
- **Express.js** - Fast, unopinionated web framework
- **Node.js** - JavaScript runtime environment

### **Database & ORM**
- **MongoDB** - NoSQL database for flexible data storage
- **MongoDB Driver** - Native MongoDB connection and operations

### **Authentication & Security**
- **Firebase Admin SDK** - Secure authentication and token verification
- **CORS** - Cross-origin resource sharing
- **Environment Variables** - Secure configuration management

### **Payment Processing**
- **Stripe** - Payment gateway integration
- **@stripe/stripe-js** - Stripe JavaScript SDK

### **Utilities**
- **dotenv** - Environment variable management

## API Endpoints

### 🔐 **Authentication Endpoints**
```
GET    /                           - Server health check
GET    /users/:email/role          - Get user role by email
GET    /users/:email/info          - Get user information
POST   /users                      - Create new user
POST   /users/make-admin/:email    - Make user admin (setup)
```

### 👥 **User Management (Admin Only)**
```
GET    /users                      - Get all users (paginated)
GET    /users/search               - Search users by email
PATCH  /users/:id/role             - Update user role
PATCH  /users/email/:email/role    - Update user role by email
PATCH  /users/:id/ban              - Ban/unban user
```

### 🐾 **Pet Management**
```
GET    /pets/available             - Get available pets (public)
GET    /pets/all                   - Get all pets (admin)
GET    /pets/:id                   - Get pet by ID
GET    /pets                       - Get user's pets
POST   /pets                       - Create new pet
PUT    /pets/:id                   - Update pet
PUT    /pets/:id/adopt             - Mark pet as adopted
DELETE /pets/:id                   - Delete pet
DELETE /pets/:id/admin             - Delete pet (admin)
PUT    /pets/:id/adoption-status   - Update adoption status (admin)
```

### 💝 **Donation Campaigns**
```
GET    /donations                  - Get all campaigns (public)
GET    /donations/all              - Get all campaigns (admin)
GET    /donations/:id              - Get campaign by ID
GET    /donations/user/:email      - Get user's campaigns
POST   /donations                  - Create new campaign
PUT    /donations/:id              - Update campaign
PUT    /donations/:id/status       - Update campaign status
PUT    /donations/:id/donate       - Process donation
DELETE /donations/:id              - Delete campaign
PUT    /donations/:id/admin-status - Update status (admin)
DELETE /donations/:id/admin        - Delete campaign (admin)
```

### 📊 **Adoption System**
```
GET    /adoptions                  - Get all adoptions
GET    /adoptions/user/:email      - Get user's adoptions
POST   /adoptions                  - Create adoption request
PUT    /adoptions/:id/status       - Update adoption status
```

### 💳 **Payment System**
```
POST   /create-payment-intent      - Create Stripe payment intent
POST   /payments                   - Process payment
GET    /payments                   - Get payment history (admin)
DELETE /payments/:id               - Delete payment record
```

## Database Schema

### **Collections**
- **users** - User profiles and authentication data
- **pets** - Pet profiles and adoption information
- **adoptions** - Adoption requests and status tracking
- **donations** - Campaign and donation data
- **payments** - Payment transaction records

## Getting Started

### **Prerequisites**
- Node.js (v16 or higher)
- MongoDB Atlas account
- Firebase project with Admin SDK
- Stripe account for payments

### **Installation**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/omarfaruk-dev/petify-server.git
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DB_USER=your_mongodb_username
   DB_PASS=your_mongodb_password
   FB_SERVICE_KEY=your_firebase_service_account_key_base64
   PAYMENT_GATEWAY_KEY=your_stripe_secret_key

   ```

4. **Start the server:**
   ```bash
   npm start
   ```

### **Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port number | No (default: 3000) |
| `DB_USER` | MongoDB username | Yes |
| `DB_PASS` | MongoDB password | Yes |
| `FB_SERVICE_KEY` | Firebase service account key (base64) | Yes |
| `PAYMENT_GATEWAY_KEY` | Stripe secret key | Yes |

## API Authentication

### **Firebase Token Authentication**
All protected endpoints require a valid Firebase ID token in the Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

### **Admin Authorization**
Admin-only endpoints require:
1. Valid Firebase token
2. User role set to 'admin' in database

### **Middleware Functions**
- `verifyFBToken` - Validates Firebase ID tokens
- `verifyAdmin` - Checks user admin privileges

## Security Features

- **CORS Configuration** - Secure cross-origin requests
- **Input Validation** - Request data sanitization
- **Token Verification** - Firebase Admin SDK integration
- **Role-Based Access** - Admin privilege management
- **Environment Variables** - Secure configuration management
- **Error Handling** - Comprehensive error responses


**Petify Server** – Powering Pet Adoption & Donation Platform 🚀 