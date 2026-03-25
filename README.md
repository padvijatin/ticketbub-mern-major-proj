# TicketHub MERN Project

TicketHub is a full-stack MERN ticket booking project with a React + Vite frontend and an Express + MongoDB backend. The current build includes a working authentication flow, shared site layout, Tailwind CSS styling, protected user fetch, and scaffolded pages for movies, sports, events, admin, about, and contact.

## Current status

- Frontend is running on React 19, Vite 7, React Router 7, Tailwind CSS 4, Axios, and React Toastify.
- Backend is running on Express 5, MongoDB with Mongoose, JWT authentication, bcrypt password hashing, and Zod validation.
- Register, login, logout, and authenticated user fetch are implemented end to end.
- Main content routes exist in the UI, but most non-auth pages are still placeholders at this stage.

## Features

- User registration with username, email, phone, and password
- User login with JWT-based authentication
- Password hashing with `bcrypt`
- Protected `/api/auth/user` route using bearer tokens
- Logout endpoint and frontend auth state cleanup
- Shared navbar and footer with logged-in state handling
- Tailwind CSS v4 setup using the official Vite plugin
- Toast notifications for auth success and error states

## Tech stack

- Frontend: React, Vite, React Router DOM, Tailwind CSS, Axios, React Toastify
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Zod

## Project structure

```text
TicketHub/
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- store/
|   |   `-- utils/
|   |-- package.json
|   `-- README.md
|-- server/
|   |-- controllers/
|   |-- middlewares/
|   |-- models/
|   |-- router/
|   |-- utils/
|   |-- validators/
|   |-- server.js
|   |-- package.json
|   `-- README.md
`-- README.md
```

## Frontend routes

- `/`
- `/movies`
- `/sports`
- `/events`
- `/about`
- `/contact`
- `/admin`
- `/register`
- `/login`
- `/logout`

## Backend API

Base URL: `http://localhost:5000/api/auth`

- `POST /register` creates a user and returns a token
- `POST /login` validates credentials and returns a token
- `GET /user` returns the logged-in user for a valid bearer token
- `POST /logout` accepts a valid bearer token and returns a success message

## Environment variables

Backend values are loaded from `server/.env`.

Required server variables:

- `PORT=5000`
- `MONGODB_URI=your_mongodb_connection_string`
- `JWT_SECRET=your_secret_key`
- `CLIENT_URL=http://localhost:5173,http://localhost:5174`

Optional client variable:

- `VITE_API_URL=http://localhost:5000/api/auth`

The frontend already falls back to `http://localhost:5000/api/auth` if `VITE_API_URL` is not set.

## Local setup

### 1. Install dependencies

```bash
cd server
npm install
```

```bash
cd client
npm install
```

### 2. Configure the backend

Create `server/.env` from `server/.env.example` and add your real MongoDB URI and JWT secret.

### 3. Start the backend

```bash
cd server
npm run dev
```

### 4. Start the frontend

```bash
cd client
npm run dev
```

Frontend default URL: `http://localhost:5173`  
Backend default URL: `http://localhost:5000`

## Notes

- Auth tokens are stored in `localStorage` on the client.
- The backend CORS setup allows localhost development plus any origins listed in `CLIENT_URL`.
- The user model includes an `isAdmin` flag, but there is not yet a dedicated admin-only backend module.
- Most content pages currently act as placeholders and are ready for the next feature pass.

## Available scripts

In `client`:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

In `server`:

- `npm run dev`
- `npm start`

## Authoring direction

This repository currently focuses on the core authentication flow and the base website shell. The next logical milestone would be building real ticket listings, booking flows, user dashboards, and admin management screens on top of the existing auth foundation.
