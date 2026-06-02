LiftLog

A self-hosted workout tracker that syncs across all your devices via your homelab. No cloud, no subscriptions, no data loss from browser clears.

Features

- Mobile-first UI, works as a home screen web app
- Push / Pull / Legs / Swim / Cardio workout types
- Rest timer with overlay
- Personal record tracking (estimated 1RM)
- Calendar history view
- Weekly volume stats
- Customisable weekly schedule and exercise templates
- Data syncs across all devices — phone, desktop, tablet
- Data stored server-side in a single JSON file — survives browser clears, Fire Button, anything

Stack

- Frontend Vanilla JS, HTML, CSS + Bootstrap 5
- Backend Node.js + Express (serves the app and stores data)
- Deployment Docker + Docker Compose
- Sync self-hosted API — all devices hit the same endpoint

Deploy

Prerequisites
- Docker + Docker Compose on your server
- (Optional) Tailscale for remote access from anywhere

1. Clone the repo

```bash
git clone https://github.com/matthewondevilla/liftlog.git
cd liftlog
```

2. Create the data directory

```bash
mkdir -p /mnt/media/liftlog
```

- Change this path in `docker-compose.yml` to wherever you want data stored.

3. Start it

```bash
docker compose up -d --build
```

LiftLog is now running at `http://your-server-ip:3456`

4. Access from anywhere (Tailscale)

```bash
Get your server's Tailscale IP
tailscale ip -4
```

Then open `http://<tailscale-ip>:3456` on any device. On mobile, add it to your home screen for an app-like experience.

Data

All workout data is stored in a single JSON file on your server:

```
/mnt/media/liftlog/liftlog.json
```

It persists through container restarts, rebuilds, and browser clears. Back it up like any other file.

Project Structure

```
liftlog/
├── server.js          ← Express API + static file server
├── package.json
├── Dockerfile
├── docker-compose.yml
└── public/
    ├── index.html
    ├── liftlog.js     ← app logic (saves to API, not localStorage)
    └── liftlog.css
```
