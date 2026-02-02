# Curl recipes

## Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"AdminPass1!a"}'
```

## Refresh (requires Bearer)

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

## Logout (requires Bearer)

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

## Admin ping (requires admin role)

```bash
curl -X GET http://localhost:3000/admin/ping \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```