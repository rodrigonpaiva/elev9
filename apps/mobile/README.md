# Mobile App

## Environment

The mobile app reads the backend URL from `EXPO_PUBLIC_API_URL`.

Create a local env file from the example:

```bash
cp .env.example .env
```

Then set:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3333
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

This starts the API on port `3333`.

## Run The Mobile App

From `apps/mobile`:

```bash
npm run start
```

Recommended from the repository root:

```bash
npx nx run mobile:start --args="--port 8081 --localhost"
```

Or directly from the mobile app:

```bash
cd apps/mobile
npx expo start --port 8081 --localhost
```

If port `8081` is busy, start Expo on another port:

```bash
npm run start -- --port 8082
```

## Expo ERR_SOCKET_BAD_PORT 65536

If Expo fails before serving with:

```txt
ERR_SOCKET_BAD_PORT
Port: 65536
```

this is caused by sandbox or runtime socket restrictions. Expo uses
`freeport-async` to probe local ports before starting Metro. If the runtime
cannot bind local sockets, every port probe is treated as unavailable until the
probe reaches `65536`, which is outside the valid Node.js port range.

This is not a workspace, Nx, or project configuration issue. Do not patch Expo
or `freeport-async` unless the same error reproduces in a normal terminal.

Start the mobile app from a normal terminal with socket permissions:

```bash
npx nx run mobile:start --args="--port 8081 --localhost"
```

or:

```bash
cd apps/mobile
npx expo start --port 8081 --localhost
```

## Node Version

Use Node 22 LTS for local development. The repository root includes `.nvmrc`
with Node 22 so `nvm use` selects the expected runtime.

## Notes

- `EXPO_PUBLIC_API_URL` is required
- the app throws a clear error during startup if the variable is missing
- backend configuration was not changed
