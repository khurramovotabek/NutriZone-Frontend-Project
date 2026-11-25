// pm2 process for the live storefront (used by the backend repo's docker/deploy/deploy.sh).
// Cluster mode: several Next.js processes share :3000, so one slow render no longer queues every other shopper
// (6 parallel requests took 1-2 s each on the single process, 2026-11-20), and `pm2 reload` restarts them one at a
// time with no gap. Safe since the backend answers a refresh token presented twice within 30 s with the same pair
// (identity refresh_grace): the per-process dedupe in src/proxy.ts is no longer the only guard.
module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      exec_mode: "cluster",
      instances: Number(process.env.NZ_WEB_INSTANCES || 2), // 2 (not 3) since 2026-11-25: the 12 GB server ran out of RAM
      env: { NODE_ENV: "production" },
      max_memory_restart: "900M",
      listen_timeout: 30000, // a worker counts as up once it listens; reload waits for that before taking the next one
      kill_timeout: 10000, // in-flight requests finish before a worker is replaced
    },
  ],
};
