# TicketHub Client

This is the frontend for TicketHub. It is built with React and Vite, styled with Tailwind CSS v4, and connected to the backend auth API with Axios.

## Stack

- React 19
- Vite 7
- React Router DOM 7
- Tailwind CSS 4
- Axios
- React Toastify

## Run locally

```bash
cd client
npm install
npm run dev
```

The development server runs on `http://localhost:5173` by default.

## Build

```bash
npm run build
```

## Environment variable

Optional:

```env
VITE_API_URL=http://localhost:5000/api/auth
```

If `VITE_API_URL` is not provided, the app uses `http://localhost:5000/api/auth`.

## Routes

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

## Current frontend coverage

- Responsive navbar and footer
- Auth context with token persistence in `localStorage`
- Registration form
- Login form
- Logout flow
- Toast-based success and error messaging

## Current limitations

- The non-auth content pages are still placeholders
- Booking flows, search, and admin dashboard features are not implemented yet

## Styling note

The project uses the official Tailwind CSS Vite plugin and keeps the site color kit in `src/index.css` through shared CSS variables for consistent theming.
