/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_SOUNDCLOUD_CLIENT_ID?: string;
  /** Optional override; defaults to window.location.origin + "/" */
  readonly VITE_SOUNDCLOUD_REDIRECT_URI?: string;
  /**
   * Dev-only fallback if SOUNDCLOUD_CLIENT_SECRET is unset.
   * Prefer SOUNDCLOUD_CLIENT_SECRET (non-VITE) so it never ships to the browser.
   */
  readonly VITE_SOUNDCLOUD_CLIENT_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
