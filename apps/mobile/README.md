# Mobile App

## Environment

The mobile app reads the backend URL from `EXPO_PUBLIC_API_URL`.

Create a local env file from the example:

```bash
cp .env.example .env
```

Then set:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
```

## How To Find Your Local IP

Use the IP address of the machine running the NestJS backend.

macOS or Linux:

```bash
ifconfig
```

Look for the active local network address, usually something like `192.168.x.x`.

Windows:

```bash
ipconfig
```

Look for the IPv4 address of the active network adapter.

Do not use `localhost` when testing from a physical device, because the phone resolves `localhost` to itself, not to your backend machine.

## Run The Backend

From the repository root:

```bash
npm run start
```

This starts the API on port `3000`.

## Run The Mobile App

From `apps/mobile`:

```bash
npm run start
```

If port `8081` is busy, start Expo on another port:

```bash
npm run start -- --port 8082
```

## Notes

- `EXPO_PUBLIC_API_URL` is required
- the app throws a clear error during startup if the variable is missing
- backend configuration was not changed
