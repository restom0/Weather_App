import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev-only middleware that runs the Vercel serverless functions in /api during
 * `npm run dev`, so the full app (including the API proxy + rate limiting) works
 * locally without needing `vercel dev`. It is inert in production builds.
 */
function devApiMiddleware() {
  return {
    name: "dev-api-middleware",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        const url = new URL(req.url, "http://localhost");
        const route = url.pathname.slice("/api/".length).replace(/\/$/, "");
        if (!route) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${route}.js`);
          // Shim the Vercel Node request/response helpers.
          req.query = Object.fromEntries(url.searchParams.entries());
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (body) => {
            if (!res.getHeader("Content-Type")) {
              res.setHeader("Content-Type", "application/json");
            }
            res.end(JSON.stringify(body));
            return res;
          };
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error(`[dev-api] ${route}: ${err.message}`);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Dev API error: ${err.message}` }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env values (no VITE_ prefix filter) into process.env so the dev API
  // middleware can read OPENWEATHER_API_KEY and the rate-limit settings.
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["OPENWEATHER_API_KEY", "RATE_LIMIT_MAX", "RATE_LIMIT_WINDOW_MS"]) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [react(), devApiMiddleware()],
  };
});
