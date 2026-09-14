# Telemetry

Developer infrastructure and reliability platform.

## Quick Start (Docker Compose)

Make sure [Docker](https://docs.docker.com/get-docker/) is installed and running, then:

```bash
docker compose up --build
```

This spins up three containers:

| Service  | URL                        | Description                       |
| -------- | -------------------------- | --------------------------------- |
| **client** | http://localhost:5173      | React UI (Vite dev server)        |
| **server** | http://localhost:4000      | Express API                       |
| **mongo**  | localhost:27017            | MongoDB instance                  |

Open **http://localhost:5173** in your browser — you should see a health card showing:

- **status:** ok
- **mongoConnected:** true

To stop everything:

```bash
docker compose down
```

To stop and also remove the MongoDB data volume:

```bash
docker compose down -v
```

## Local Development (without Docker)

```bash
# Terminal 1 — start MongoDB locally, then:
cd server && npm install && npm start

# Terminal 2
cd client && npm install && npm run dev
```

Visit http://localhost:5173.

## Project Structure

```
Telemetry/
├── client/          # React + Vite front-end
├── server/          # Express + Mongoose API
└── docker-compose.yml
```
