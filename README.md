# The Good Edit

A single-post web app with a public reading page and a password-protected admin panel. Visitors can comment with only a name; the admin can edit the post and manage reviews.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. The admin panel is at `/admin`. For local development only, the default admin password is **`admin123`**. To use a different one, start the app with `ADMIN_PASSWORD=your-password npm run dev`.

The initial post and reviews are **example content** and can be replaced or removed in the admin panel. A new installation starts with no visitor comments. Images can be supplied by URL or uploaded as JPG, PNG, WEBP, or GIF (up to 2 MB each).

## Production

```sh
npm run build
ADMIN_PASSWORD='a-long-unique-password' DATA_DIR=/path/to/persistent-storage npm start
```

`ADMIN_PASSWORD` is mandatory in production; there is no production default. `PORT` defaults to `3000`. Terminate TLS at a trusted reverse proxy and use HTTPS in production. Admin sessions are HTTP-only cookies and expire after eight hours or a server restart.

The Node server saves the post, reviews, uploaded images, and comments together in `DATA_DIR/content.json` (default: `./data/content.json`). Back up this file. The file is intentionally ignored by Git and must live on a **persistent volume** for data to survive redeployments. This simple storage is intended for one Node server process, not stateless/serverless hosting or multiple replicas. Visitors share the same server data; only the theme and the remembered commenter name are stored in the browser.

## Supplied UI library

The app uses the provided **OWN / vakeem-library** React library: its design tokens and global styles are in `src/styles`, and the supplied Button, IconButton, Input, Textarea, Avatar, RatingInput, Modal, and icons are in `src/vendor/own-ui`. The rating input and modal have small adaptations for controlled editing and keyboard accessibility. Layout and colors are adjusted for this app while retaining the library's theme system.

## Checks

```sh
npm test       # API, access control, validation, review CRUD, and persistence
npm run build  # production frontend
```
