# Todo Management Application

Backend service for managing todos with in-memory cache and JSON file persistence.

## Project Structure

```
todo-app/
├── src/
│   ├── models/          # Type definitions and Zod schemas
│   ├── data/            # Data access layer (file storage, cache, locking)
│   ├── business/        # Business logic layer (status calculation, filtering)
│   ├── api/             # API layer (routes, handlers, middleware)
│   ├── server.ts        # Application entry point
│   └── AGENTS.MD        # Decision log
├── docs/                # Design documentation
├── package.json
└── tsconfig.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Run in development mode:
```bash
npm run dev
```

4. Run production build:
```bash
npm start
```

## Dependencies

- **express** - HTTP server framework
- **uuid** - UUID v4 generation
- **zod** - Runtime validation and type inference
- **tsx** - TypeScript execution for development

## Architecture

This application follows a layered architecture:

1. **API Layer** - Handles HTTP requests, validation, routing
2. **Business Logic Layer** - Status calculation, filtering, validation rules
3. **Data Access Layer** - In-memory cache with file persistence, locking

See `docs/design/hld.md` for complete architecture documentation.

## Decision Log

All architectural and implementation decisions are tracked in `src/AGENTS.MD`.

