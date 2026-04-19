# TicketHub

TicketHub is a full-stack MERN ticket-booking platform for movies, sports, and live events. It combines event discovery, seat booking, payments, ticket delivery, wishlist support, and admin management in one responsive project.

## Core Features

- authentication with email/password and Google OAuth
- browsing for movies, sports, and live events
- seat selection with live availability updates
- Razorpay payment flow
- QR ticket generation and email delivery
- wishlist and booking history
- admin and organizer dashboards
- coupon management and event moderation
- responsive UI across desktop, tablet, and mobile

## Latest Frontend Update

This release focuses on the customer-facing hero experience:

- redesigned the home hero with a lighter cinematic layout
- added a reusable `HeroPosterCard` component
- refreshed listing page hero banners
- rebuilt the event details hero with clearer metadata chips
- aligned poster rendering with shared CSS utility classes
- polished the About page heading colors

See [CHANGES.md](./CHANGES.md) for the release summary.

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Tailwind CSS
- Axios
- TanStack React Query
- Swiper
- Framer Motion

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Razorpay
- Nodemailer
- Cloudinary
- Socket.IO

## Project Structure

```text
TicketHub/
|-- client/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- store/
|   |   `-- utils/
|   `-- package.json
|-- server/
|   |-- controllers/
|   |-- middlewares/
|   |-- models/
|   |-- router/
|   |-- utils/
|   `-- package.json
|-- README.md
|-- CHANGES.md
`-- push.md
```

## Local Setup

### Install dependencies

```bash
cd server
npm install
cd ../client
npm install
```

### Start development servers

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

- frontend: `http://localhost:5173`
- backend: `http://localhost:5000`

## Environment

Create `server/.env` with your real credentials. Typical variables include:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=use_a_long_secure_secret
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

Optional frontend variable:

```env
VITE_API_URL=http://localhost:5000/api
```

## Scripts

### Client

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test:run`

### Server

- `npm run dev`
- `npm start`
- `npm run test:run`

## Repository

- GitHub: `https://github.com/padvijatin/TicketHub-Mern-Major-Proj`

