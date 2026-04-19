# TicketHub Changes

## Frontend Hero Refresh

- Rebuilt the home hero into a cleaner split layout with softened poster backdrops and a dedicated floating poster card.
- Refined carousel navigation buttons and pagination dots to better match the lighter TicketHub visual system.
- Added reusable `HeroPosterCard` support so hero sections can share the same poster presentation pattern.

## Event and Listing UI

- Redesigned page-level hero banners for event, movie, and sports listings with brighter overlays, stronger readability, and richer metadata presentation.
- Updated the event details hero with category, date, time, and venue chips while keeping the booking path unchanged.
- Standardized poster rendering through shared image utility classes to keep cards and hero artwork visually consistent.

## Supporting Polish

- Adjusted the About page heading color to better fit the refreshed palette.
- Kept the home fallback state aligned with the new hero structure for empty or loading content.

## Files Updated

- `client/src/components/EventCard.jsx`
- `client/src/components/HeroCarousel.jsx`
- `client/src/components/HeroPosterCard.jsx`
- `client/src/components/PageHeroCarousel.jsx`
- `client/src/index.css`
- `client/src/pages/About.jsx`
- `client/src/pages/EventDetails.jsx`
- `client/src/pages/Home.jsx`

## Verification

- frontend lint: passed
- frontend build: passed
