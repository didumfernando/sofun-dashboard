# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/create-vite/template-react) uses [Oxc](https://oxc.rs/)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Login

The server creates a `login` table with `email` and hashed `password` columns in `data/sofun.db`. Seed the first account by starting the server with `LOGIN_EMAIL` and `LOGIN_PASSWORD` set, for example:

```powershell
$env:LOGIN_EMAIL = "defence@example.com"
$env:LOGIN_PASSWORD = "change-this-password"
npm run dev
```

The account is inserted only when that email does not already exist. Existing dashboard API routes require the login session created by the login page.
