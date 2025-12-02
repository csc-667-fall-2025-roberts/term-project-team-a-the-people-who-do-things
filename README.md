# Scrabble Online

A multiplayer Scrabble game built with Node.js, Express, Socket.IO, and PostgreSQL.

## Features

- **Real-time Multiplayer**: Play Scrabble with strangers online
- **User Authentication**: Secure login and registration system with session management
- **Game Lobby**: Browse and join available games or create your own
- **Interactive Game Board**: Drag-and-drop tile placement with visual feedback
- **Score Tracking**: Automatic word validation and score calculation
- **Live Chat**: In game chat functionality for players
- **User Settings**: Customize preferences, update account info, and change passwords
- **Game Results**: View final scores, statistics, and request rematches

## Tech Stack

### Frontend
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - CSS framework
- **Vite** - Fast development build tool
- **Socket.IO Client** - Bidirectional communication

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **Socket.IO** - WebSocket server
- **PostgreSQL** - Relational database
- **EJS** - Server-side templating
- **bcrypt** - Password hashing
- **express-session** - Session middleware

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation


1. Install dependencies:
```bash
npm i
```

2. Set up environment variables:
Create a `.env` file in the root directory:


3. Run database migrations:
```bash
npm run migrate:up
```

## Development

Run both the server and Vite dev server concurrently:
```bash
npm run dev:all
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Vite Dev Server: `http://localhost:5173`

## Production Build

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Database Migrations

- **Create a new migration**: `npm run migrate:create <migration-name>`
- **Run migrations**: `npm run migrate:up`
- **Rollback migrations**: `npm run migrate:down`
- **Reset database**: `npm run db:reset`

## Structure

```
src/
├── server/           # Backend code
│   ├── index.ts     # Server entry point
│   ├── routes/      # API routes
│   ├── services/    # Business logic
│   └── DB/          # Database configuration and migrations
├── public/          # Frontend assets
│   ├── ts/          # TypeScript files
│   │   ├── screens/ # Page-specific scripts
│   │   └── api.ts   # API client
│   └── styles/      # CSS files
└── views/           # EJS templates
    ├── screens/     # Page templates
    └── components/  # Reusable components
```

## Available Scripts


- `npm run dev:all` - Start both servers concurrently
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate:up` - Run database migrations
- `npm run migrate:down` - Rollback last migration
- `npm run db:reset` - Reset database (drop and recreate all tables)

## Game Rules

This implementation follows standard Scrabble rules:
- Players take turns placing tiles on a 15x15 board
- Words must be valid and connect to existing words
- Special tiles (Double/Triple Letter/Word) multiply scores
- First word must cross the center star tile
- Game ends when tile bag is empty and a player uses all tiles

## Contributing

Stella Parker @whoIsStella, PEOPLE PUT YOUR NAMES HERE
Ben Klein @ben-m-klein (and @benmklein),
Emily Perez @emilynperez
