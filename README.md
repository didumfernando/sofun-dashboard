<<<<<<< HEAD
# sofun-dashboard
SOFUN tracker dashboard for army
=======
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

## Deploy to Render

This app uses SQLite, so deploy it as a Render web service with a persistent disk. The included `render.yaml` configures the build, start command, disk mount, and private login environment variables.

1. Push this project to a GitHub repository.
2. In Render, choose **New > Blueprint** and select the repository.
3. Set `LOGIN_EMAIL` and `LOGIN_PASSWORD` when Render prompts for the blueprint secrets.
4. Deploy and open the generated `onrender.com` URL.

The database is stored under `/var/data` in production and survives service restarts and deploys. Keep the Render persistent disk attached; removing it deletes the production database.
>>>>>>> 02d0e71 (Prepare app for deployment)
