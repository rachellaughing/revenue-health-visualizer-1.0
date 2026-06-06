## Fix: Link "Start / Resume" to `/health-check`

The sidebar's "Start / Resume" nav item currently points to `/health-check/start`, but the actual Health Check route is `/health-check`.

### Change
In `src/components/app-sidebar.tsx`, update the `url` field for the "Start / Resume" item:

```
{ title: "Start / Resume", url: "/health-check", icon: PlayCircle, lock: "profile" },
```

That is the only change needed.