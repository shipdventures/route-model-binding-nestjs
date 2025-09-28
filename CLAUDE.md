# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build
```bash
npm run build  # Build the route-model-binding library
```

### Linting
```bash
npm run lint  # Run ESLint on all files
```

### Testing
```bash
npm run test       # Run unit tests in watch mode
npm run test:e2e   # Run end-to-end tests in watch mode

# To run a single test file
npx jest path/to/test.spec.ts --runInBand

# To run tests without watch mode
npx jest --runInBand
```

## Architecture Overview

This is a NestJS library project that provides route model binding functionality for NestJS applications. The project consists of:

### Core Library (`libs/route-model-binding/`)
The main library that provides automatic route parameter to model binding:
- **RouteModelBindingMiddleware** (`libs/route-model-binding/src/middlewares/route-model-binding.middleware.ts`): Middleware that intercepts route parameters and automatically fetches corresponding TypeORM entities from the database
- **@RouteModel decorator** (`libs/route-model-binding/src/decorators/route-model.decorator.ts`): Parameter decorator for extracting bound models from the request

### How It Works
1. Routes are defined with parameters matching entity names (e.g., `/users/:user/posts/:post`)
2. The middleware intercepts these parameters and looks up entities using TypeORM repositories
3. Found entities are attached to `req.routeModels` 
4. The `@RouteModel` decorator extracts specific models in controller methods

### Example Application (`src/`)
A sample NestJS application demonstrating library usage:
- Uses TypeORM with SQLite in-memory database
- Defines User and Post entities
- Shows route model binding in `AppController`

## Important Configuration

- **Node Version**: Requires Node.js >= 22.0.0 (see `.nvmrc`)
- **TypeScript**: Strict null checks enabled, explicit function return types required
- **ESLint**: Configured with TypeScript support, Prettier integration, no semicolons
- **Testing**: Jest with TypeScript support, custom matchers in `fixtures/matchers/`