# Calendar Pro Frontend

Modern React + TypeScript + Tailwind frontend for the existing Calendar backend.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Notes

- API base URL defaults to http://localhost:5000/api.
- JWT access token is stored in localStorage.
- Refresh token is handled by the backend httpOnly cookie.