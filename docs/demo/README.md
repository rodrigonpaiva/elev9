# Demo Guide

## Goal

This guide is intended for a recruiter, engineering manager, or technical lead who wants to run a quick local demo of the current Elev9 Coach MVP.

## What Can Be Demonstrated

- user registration
- user login
- JWT-authenticated session flow
- dashboard retrieval through the mobile client
- backend modular structure and specs

## Prerequisites

- Node.js and npm
- MongoDB instance available locally or remotely
- a machine on the same network as the mobile device or simulator when testing the Expo app

## Backend Setup

Create the backend environment file:

```bash
cp .env.example .env
```

Set:

- `PORT=3000`
- `MONGODB_URI=<your MongoDB connection string>`

Install dependencies and start the API:

```bash
npm install
npm run start
```

## Mobile Setup

Create the mobile environment file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set:

- `EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000`

Then start the mobile app:

```bash
npm run mobile:start
```

If `localhost` does not work on a physical device, use your machine's local network IP.

## Test User

The repository does not ship with a hardcoded demo account.

Recommended demo approach:

1. Register a user through the backend endpoint `POST /auth/register`
2. Use the same credentials on the mobile login screen

Example registration payload:

```json
{
  "name": "Demo User",
  "email": "demo@elev9.local",
  "password": "StrongPass123"
}
```

## Demonstrable Flow

### Minimum path

1. Start backend
2. Start mobile app
3. Register a user through API
4. Log in through the mobile app
5. Show authenticated dashboard loading

### Better technical walkthrough

1. Open the repository structure
2. Show `apps/api` and domain modules
3. Show `docs/specs` as the source of behavior decisions
4. Show shared packages:
   - `packages/types`
   - `packages/api-client`
   - `packages/ui`
5. Demonstrate the mobile login and home dashboard flow

## Notes For Reviewers

- This is an MVP in active evolution
- The goal is to show implementation discipline, architecture clarity, and coherent product scaffolding
- The project intentionally avoids claiming production readiness at this stage
