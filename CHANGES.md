# TicketHub Changes

This file summarizes the implemented product and UI work reflected in the current codebase and documentation set.

## Platform Features

- Added user registration, login, logout, profile editing, and password update flows.
- Added Google OAuth entry support.
- Added movie, sports, and live-event discovery pages.
- Added booking history, wishlist, profile, and ticket pages.
- Added admin and organizer management screens.

## Discovery and Content Browsing

- Added home discovery rails for multiple content groups.
- Added event, movie, and sports listing pages.
- Added listing filters and shared discovery utilities.
- Added discover-feed support on the backend for recommended and engagement-based content delivery.
- Added map support and richer metadata on event detail screens.

## Booking and Payment Flow

- Added seat selection experiences for theater, stadium, and event layouts.
- Added live seat-lock support with socket-aware client utilities and backend services.
- Added booking summary and booking confirmation flows.
- Added Razorpay order creation and payment verification endpoints.
- Added coupon validation support during payment flows.

## Ticket Delivery

- Added QR-based ticket generation.
- Added ticket page rendering and protected ticket fetch support.
- Added Cloudinary-backed ticket asset handling.
- Added email delivery support for tickets.

## Admin and Organizer Work

- Added dashboard overview screens.
- Added event create, update, and delete flows.
- Added booking management flows.
- Added user management flows.
- Added coupon creation and coupon update flows.

## Validation, Security, and API Support

- Added JWT-protected routes on authenticated API surfaces.
- Added Zod request validation on auth and payment-sensitive flows.
- Added rate limiting on auth and payment endpoints.
- Added CORS allowlist handling through runtime config.
- Added Helmet middleware and upload error handling.

## UI and Visual Updates

- Rebuilt the home hero into a split layout with brighter overlays and side poster artwork.
- Added a reusable `HeroPosterCard` component for hero sections.
- Refined carousel navigation buttons and pagination dots.
- Redesigned listing-page hero banners for movies, sports, and events.
- Rebuilt the event details hero with category, date, time, and venue chips.
- Standardized poster rendering with shared CSS utility classes.
- Adjusted the About page heading color to align with the refreshed visual palette.
- Kept the empty-state hero on the home page aligned with the new hero structure.

## Documentation Updates

- Rewrote the root `README.md`.
- Rewrote `client/README.md`.
- Rewrote `server/README.md`.
- Added `FLOWCHART.md`.
- Updated `push.md` with current verification commands and release steps.

## Verification

Verified on April 19, 2026:

- frontend lint: passed
- frontend tests: passed
- frontend build: passed
- backend tests: passed

Verification commands:

- `cd client && npm.cmd run lint`
- `cd client && npm.cmd run test:run`
- `cd client && npm.cmd run build`
- `cd server && npm.cmd run test:run`

## Current Verification Note

- The frontend production build completed successfully.
- Vite reported a large-chunk warning for the main bundle, which is a performance optimization note and not a build failure.
# Deployment note

- triggered a follow-up deploy commit so Render can pick up the latest backend runtime config changes reliably

