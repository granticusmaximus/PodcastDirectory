# Podcast Directory

A React + TypeScript application for searching and cataloging podcasts with a local SQLite database.

## Features

- 🔍 Search for podcasts using the iTunes/Apple Podcasts API
- 📚 Save podcasts to your local library
- 🏷️ Filter podcasts by category (History, Comedy, True Crime, etc.)
- 🎧 Audio player with queue management
- 👤 User authentication and profiles
- 🔐 Forgot password with email reset
- 💾 SQLite database for persistent storage
- 🎨 Clean, modern UI with responsive design
- 🐳 Docker support with multi-stage builds

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Express.js
- **Database:** SQLite (better-sqlite3)
- **Routing:** React Router
- **HTTP Client:** Axios
- **Styling:** CSS

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Running the Application

To run both the frontend and backend simultaneously:

```bash
npm run dev:all
```

Or run them separately:

```bash
# Terminal 1 - Frontend (Vite dev server on port 5173)
npm run dev

# Terminal 2 - Backend (Express server on port 3001)
npm run server
```

The application will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Project Structure

```
├── server/
│   ├── database.ts       # SQLite database setup and operations
│   └── index.ts          # Express API server
├── src/
│   ├── components/       # React components
│   │   ├── CategoryFilter.tsx
│   │   ├── PodcastCard.tsx
│   │   └── SearchBar.tsx
│   ├── pages/            # Page components
│   │   ├── Library.tsx   # User's saved podcasts
│   │   └── Search.tsx    # Search for new podcasts
│   ├── services/
│   │   └── api.ts        # API service functions
│   ├── types/
│   │   └── podcast.ts    # TypeScript interfaces
│   ├── App.tsx           # Main app component with routing
│   └── main.tsx          # Entry point
```

## API Endpoints

- `GET /api/search?term=<query>` - Search iTunes for podcasts
- `GET /api/podcasts` - Get all saved podcasts
- `GET /api/podcasts/category/:category` - Filter by category
- `GET /api/podcasts/search?q=<query>` - Search local library
- `GET /api/podcasts/:id` - Get specific podcast
- `POST /api/podcasts` - Add podcast to library
- `PUT /api/podcasts/:id` - Update podcast
- `DELETE /api/podcasts/:id` - Remove podcast
- `GET /api/categories` - Get all unique categories

## Features

### Search Page

- Search iTunes/Apple Podcasts catalog
- View detailed podcast information
- Add podcasts to your library

### Library Page

- View all saved podcasts
- Filter by category
- Search within your library
- Remove podcasts

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## License

MIT

```
