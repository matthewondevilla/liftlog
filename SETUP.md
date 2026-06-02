# LiftLog — Self-Hosted Setup Guide

## What's in this package

```
liftlog/
├── server.js          ← Node.js API server (serves app + stores data)
├── package.json
├── Dockerfile
├── docker-compose.yml
└── public/
    ├── index.html
    ├── liftlog.js     ← modified: saves to server instead of localStorage
    └── liftlog.css
```

Your workout data lives in a single JSON file on your server at
`/mnt/media/liftlog/liftlog.json` — survives container restarts,
browser clears, Fire Button, everything.

---

## Deploy on your homelab (192.168.1.188)

### 1. Copy the files to your server

```bash
scp -r liftlog/ matthew@192.168.1.188:~/liftlog
```

### 2. SSH in and deploy

```bash
ssh matthew@192.168.1.188
cd ~/liftlog

# Create the data directory
mkdir -p /mnt/media/liftlog

# Build and start
docker compose up -d --build
```

That's it. LiftLog is now running at:
- **Local network:** http://192.168.1.188:3456
- **Via Tailscale:** http://<your-tailscale-ip>:3456

---

## Access from your phone (via Tailscale)

You already have Tailscale set up. On your phone:

1. Make sure Tailscale is connected
2. Open your browser and go to `http://<tailscale-ip-of-server>:3456`
3. On iOS/Android: tap Share → "Add to Home Screen" for an app-like icon

To find your server's Tailscale IP:
```bash
# On your server:
tailscale ip -4
```

---

## Add a friendly domain via Nginx Proxy Manager (optional)

If you want `http://lift.matthewlab.org` or similar:

1. Go to your NPM dashboard (http://192.168.1.188:81)
2. Add a Proxy Host:
   - Domain: `lift.matthewlab.org` (or whatever you want)
   - Forward Hostname: `localhost` (or `192.168.1.188`)
   - Forward Port: `3456`
   - Enable SSL if you have a cert

---

## Importing your existing data

If you exported a backup `.json` from the old browser version:

1. Open LiftLog in your browser (the new hosted version)
2. Go to Settings → Data → Import Backup
3. Select your backup file — done, all history restored

---

## Useful commands

```bash
# Check it's running
docker ps | grep liftlog

# View logs
docker logs liftlog -f

# Restart
docker compose -f ~/liftlog/docker-compose.yml restart

# Your data file
cat /mnt/media/liftlog/liftlog.json
```

---

## How syncing works

- Every device hits the same API at your server IP
- Saves are debounced (400ms) — no hammering the server mid-set
- Data is written atomically (`.tmp` → rename) so a crash can't corrupt it
- No accounts, no login — it's your homelab, your network
