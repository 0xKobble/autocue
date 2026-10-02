import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";

const DEFAULT_REDIRECT = "http://localhost:5173/";

/**
 * Dev/preview proxy for SoundCloud token exchange.
 * Keeps optional SOUNDCLOUD_CLIENT_SECRET off the client bundle.
 * Public clients (no secret) still work — body is forwarded as-is.
 * SoundCloud currently treats most apps as confidential (secret required).
 */
function soundcloudTokenProxy(env: Record<string, string>): Plugin {
  const handler = async (
    req: import("http").IncomingMessage,
    res: import("http").ServerResponse
  ) => {
    const json = (status: number, body: Record<string, unknown>) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(body));
    };

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
      return;
    }
    if (req.method !== "POST") {
      json(405, { error: "method_not_allowed" });
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
      json(400, { error: "invalid_json", error_description: "Request body must be JSON" });
      return;
    }

    const clientId = (payload.client_id || env.VITE_SOUNDCLOUD_CLIENT_ID || "").trim();
    const redirectUri = (payload.redirect_uri || env.VITE_SOUNDCLOUD_REDIRECT_URI || DEFAULT_REDIRECT).trim();
    const code = (payload.code || "").trim();
    const codeVerifier = (payload.code_verifier || "").trim();
    const grantType = (payload.grant_type || "authorization_code").trim();

    const missing: string[] = [];
    if (!clientId) missing.push("client_id");
    if (!redirectUri) missing.push("redirect_uri");
    if (grantType === "authorization_code") {
      if (!code) missing.push("code");
      if (!codeVerifier) missing.push("code_verifier");
    }
    if (missing.length) {
      json(400, {
        error: "invalid_request",
        error_description: `Missing required fields: ${missing.join(", ")}`,
      });
      return;
    }

    const body = new URLSearchParams();
    body.set("grant_type", grantType);
    body.set("client_id", clientId);
    body.set("redirect_uri", redirectUri);
    if (code) body.set("code", code);
    if (codeVerifier) body.set("code_verifier", codeVerifier);
    if (payload.refresh_token) body.set("refresh_token", payload.refresh_token);

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
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(text || "{}") as Record<string, unknown>;
      } catch {
        parsed = null;
      }

      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");

      if (parsed) {
        // Enrich bare invalid_grant with actionable hint (SC often returns only {error}).
        if (
          upstream.status >= 400 &&
          parsed.error === "invalid_grant" &&
          !parsed.error_description
        ) {
          parsed.error_description =
            `invalid_grant from SoundCloud. Check redirect_uri is exactly "${redirectUri}" ` +
            `(trailing slash), code not reused, code_verifier matches authorize challenge, ` +
            `and client_id/secret match the Autocue app. secret_present=${Boolean(secret)}.`;
        }
        if (upstream.status >= 400 && parsed.error === "invalid_client" && !secret) {
          parsed.error_description =
            (typeof parsed.error_description === "string" ? parsed.error_description + " — " : "") +
            "SOUNDCLOUD_CLIENT_SECRET is not set in web/.env.local (SoundCloud treats apps as confidential).";
        }
        res.end(JSON.stringify(parsed));
      } else {
        res.end(
          JSON.stringify({
            error: "upstream_non_json",
            error_description: text.slice(0, 300),
            status: upstream.status,
          })
        );
      }
    } catch (err) {
      json(502, {
        error: "upstream_failed",
        error_description: err instanceof Error ? err.message : "token proxy error",
      });
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
