# TicketHub Server

This backend handles authentication, event discovery, bookings, payments, tickets, wishlist operations, coupons, contact submissions, and admin management for TicketHub.

## Backend Stack

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT authentication
- Zod validation
- Razorpay
- Nodemailer
- Cloudinary
- Puppeteer
- Socket.IO
- Vitest with Supertest

## API Surface

Base path: `/api`

- `/auth` for register, login, Google OAuth, profile updates, password updates, and logout
- `/events` for event lists, event details, rating, and discover feed
- `/bookings` for booking creation, ticket delivery, booking history, and ticket fetch
- `/payment` for order creation and payment verification
- `/wishlist` for add, remove, and sync actions
- `/coupons` for coupon listing and validation
- `/admin` for dashboard stats, event management, user management, booking management, and coupon management
- `/contact` for contact form submissions

## Backend Responsibilities

- CORS and Helmet setup
- JWT-protected route handling
- request validation with shared middleware
- image upload handling
- event and booking persistence
- seat availability and booking state updates
- payment ownership and signature verification
- ticket generation and delivery flow
- recommendation feed support
- admin moderation and cleanup flows

## Backend Scripts

```bash
npm run dev
npm start
npm run test
npm run test:run
npm run sync:cloudinary-posters
```

Additional scripts in `server/scripts` support data repair and seat-layout maintenance.

## Environment

You can start from `server/.env.example` and replace placeholder values with real credentials.

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173,http://localhost:5174

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URL=http://localhost:5000/api/auth/google/callback

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=your_sender_email

CONTACT_RECEIVER_EMAIL=your_receiver_email

CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Backend Verification

Verified on April 19, 2026:

- `npm.cmd run test:run` passed

Current backend tests in the repository cover:

- app bootstrap behavior
- auth controller behavior
- auth router behavior
- booking router behavior
- coupon router behavior
- validation middleware behavior
- auth validator behavior

## Main Backend Areas

- `controllers` for route handlers
- `router` for API route wiring
- `models` for MongoDB schemas
- `middlewares` for auth, validation, upload, and rate limiting
- `services` for seat locking, recommendation logic, coupons, pricing, and sockets
- `utils` for runtime config, database helpers, mailer, and seat layout helpers
