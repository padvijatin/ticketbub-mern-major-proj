# TicketHub Server

This backend powers the TicketHub authentication flow. It exposes a small Express API backed by MongoDB and secures protected routes with JWT bearer tokens.

## Stack

- Express 5
- MongoDB + Mongoose
- JWT
- bcrypt
- Zod

## Run locally

```bash
cd server
npm install
npm run dev
```

The server starts on `http://localhost:5000` by default.

## Environment variables

Create `server/.env` and include:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173,http://localhost:5174
```

You can also copy the values from `server/.env.example` and replace them with your real credentials.

## API routes

Base path: `/api/auth`

- `POST /register`
- `POST /login`
- `GET /user`
- `POST /logout`

## Request summary

`POST /register`

```json
{
  "username": "Jatin",
  "email": "jatin@example.com",
  "phone": "9876543210",
  "password": "secret123"
}
```

`POST /login`

```json
{
  "email": "jatin@example.com",
  "password": "secret123"
}
```

Protected routes expect:

```http
Authorization: Bearer <jwt-token>
```

## Validation and auth flow

- Input validation is handled with Zod in `validators/auth-validator.js`
- Password hashing is handled in the Mongoose model pre-save hook
- JWT tokens include `userId`, `email`, and `isAdmin`
- Protected routes use `middlewares/auth-middleware.js`

## Current scope

This server currently focuses on account auth and user identity lookup. Ticket inventory, bookings, payments, and admin management APIs have not been added yet.
