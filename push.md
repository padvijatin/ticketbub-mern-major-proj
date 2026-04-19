# Push Guide

Run these commands from `c:\Projects\TicketHub`.

```powershell
git status
cd client
npm run lint
npm run build
cd ..
git add README.md CHANGES.md push.md client/src/components/EventCard.jsx client/src/components/HeroCarousel.jsx client/src/components/HeroPosterCard.jsx client/src/components/PageHeroCarousel.jsx client/src/index.css client/src/pages/About.jsx client/src/pages/EventDetails.jsx client/src/pages/Home.jsx
git commit -m "Refresh hero layouts and poster presentation"
git push origin main
```

## What This Release Includes

- refreshed home hero layout
- reusable hero poster card component
- updated event and listing hero sections
- consistent poster image styling
- about page heading color cleanup
- refreshed Markdown documentation

## GitHub Remote

- `origin`: `https://github.com/padvijatin/TicketHub-Mern-Major-Proj.git`

