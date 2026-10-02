import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";

/**
 * Dev/preview proxy for SoundCloud token exchange.
 * Keeps optional SOUNDCLOUD_CLIENT_SECRET off the client bundle.
 * Public clients (no secret) still work — body is forwarded as-is.
 */
function soundcloudTokenProxy(env: Record<string, string>): Plugin {
  const handler = async (
    req: import("http").IncomingMessage,
    res: import("http").ServerResponse
  ) => {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
      return;
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "method_not_allowed" }));
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    let payload: Record<string, string> = {};
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<
        string,
        string
      >;
    } catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "invalid_json" }));
      return;
    }

    const body = new URLSearchParams();
    body.set("grant_type", payload.grant_type || "authorization_code");
    body.set("client_id", payload.client_id || env.VITE_SOUNDCLOUD_CLIENT_ID || "");
    body.set("redirect_uri", payload.redirect_uri || "http://localhost:5173/");
    body.set("code_verifier", payload.code_verifier || "");
    body.set("code", payload.code || "");

    // Confidential apps need a secret. Prefer non-VITE env so it never ships to the browser.
    const secret =
      env.SOUNDCLOUD_CLIENT_SECRET?.trim() ||
      env.VITE_SOUNDCLOUD_CLIENT_SECRET?.trim() ||
      "";
    if (secret) {
      body.set("client_secret", secret);
    }

    try {
      const upstream = await fetch("https://secure.soundcloud.com/oauth/token", {
        method: "POST",
        headers: {
          Accept: "application/json; charset=utf-8",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      const text = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(text);
    } catch (err) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "upstream_failed",
          error_description: err instanceof Error ? err.message : "token proxy error",
        })
      );
    }
  };

  return {
    name: "autocue-soundcloud-token-proxy",
    configureServer(server) {
      server.middlewares.use("/api/soundcloud/token", (req, res) => {
        void handler(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/soundcloud/token", (req, res) => {
        void handler(req, res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), soundcloudTokenProxy(env)],
  };
});
