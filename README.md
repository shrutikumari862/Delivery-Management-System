# Smart Delivery Management System

A responsive React application that demonstrates delivery operations workflows,
from partner assignment and route planning to shipment analytics and exception
monitoring. It is a frontend prototype: demo records are stored in the browser,
and no production backend, authentication, or live tracking service is included.

## Problem statement

Delivery teams need a clear way to coordinate orders, delivery partners, planned
routes, and shipment exceptions. This project brings those workflows together
in role-oriented demo dashboards so the interfaces and rule-based operations can
be explored in one application.

## Features

- **Order assignment and partner management:** Review unassigned demo orders,
  see rule-based partner recommendations, assign or reassign eligible partners,
  and filter partners by availability and service area. Recommendations use
  availability, capacity, straight-line distance, service-area match, and
  relative workload; they are not AI-generated.
- **Route planning:** Prepare a partner's stop sequence using provided
  coordinates and a nearest-neighbor, straight-line distance heuristic. Routes
  can be saved in browser storage and viewed in the partner route workspace.
  Maps use Leaflet and OpenStreetMap tiles; directions can open in Google Maps.
- **Notifications and preferences:** Review in-app order, delivery, and alert
  notifications, mark them read, and manage in-app notification preferences.
  Notification data is local to the browser; email, SMS, and push delivery are
  not implemented.
- **Delivery analytics and delay-risk detection:** Explore filtered delivery
  metrics, charts, CSV export, and deterministic risk classifications based on
  available timestamps, recorded delays or failed attempts, and limited partner
  delivery history. This is not machine learning or a real-time prediction
  service.
- **Shipment monitoring and exceptions:** Search, filter, sort, and inspect
  shipments, review available timeline events, and manage demo exceptions
  through Open, In Progress, and Resolved states.
- **Explore Platform:** Browse the implemented tools and their demo workspaces.

The public home page and demo admin/partner workspaces are available, but the
role labels are not authentication or access control. There is no customer-facing
shipment tracking workflow, full order-management system, warehouse dashboard,
or live vehicle-position feed.

## Technology stack

- React 19 and React DOM
- Vite 8
- React Router 7
- Tailwind CSS 4
- Leaflet and React Leaflet
- Recharts
- Lucide React
- Node.js test runner (`node:test`) and Oxlint

## Project structure

```text
public/                 Static public assets
src/
  assets/               Imported images and icons
  components/           Shared UI components
  layouts/              Public, admin, and partner layouts
  pages/                Route-level screens
  services/             Demo data, analytics, notifications, and route logic
  App.jsx               Application route definitions
  main.jsx              React entry point and browser router
index.html              Vite HTML entry point
vite.config.js          Vite, React, and Tailwind configuration
```

## Requirements

Use Node.js 20.19+ or 22.12+ and npm.

## Installation and development

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

## Build, tests, and lint

```sh
npm run build
npm test
npm run lint
```

`npm run build` writes the production site to `dist/`. `npm run preview` serves
that built site locally.

## Environment variables

No environment variables are required by the current application. Do not add
credentials or private keys to the source tree. If a future integration needs
client-side configuration, document only non-secret values in an `.env.example`;
never put private credentials in Vite-exposed variables.

## Deployment

The app is a Vite single-page application and can be hosted as a static site.
No Netlify or Render configuration is currently included. Configure the chosen
host with:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **SPA fallback:** Rewrite routes to `/index.html` so React Router routes work
  when opened directly or refreshed.

On Netlify, add a rewrite rule `/* /index.html 200` (for example, in a
`_redirects` file under `public/`). On Render, create a Static Site using the
build and publish settings above, then add a rewrite from `/*` to `/index.html`
with status `200`. Verify the host's current setup screens and settings before
deploying.

## Known limitations

- Orders, partners, notifications, routes, and exceptions are illustrative
  browser-local demo data, not shared across users or devices.
- There is no backend API, database, authentication, authorization, or
  production role-based access control. Do not enter real customer or delivery
  data.
- Route distance is calculated over straight-line coordinates, not road
  networks; travel time and live GPS are not provided. Coordinates must be
  supplied where needed.
- Delay risk is a rule-based estimate and depends on available timestamps and
  event history. The supplied sample data lacks promised/actual delivery
  timestamps, so some analytics correctly report insufficient data.
- Notifications are in-app only. No email, SMS, or push provider is connected.

## Screenshots

Screenshots can be added later under `docs/screenshots/` and linked here. For
example:

```md
![Admin analytics dashboard](docs/screenshots/admin-analytics.png)
```
