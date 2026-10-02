import { useEffect } from "react";
import { loadYoutubeIframeApi } from "../audio/youtubeCuePlayer";

/**
 * Pre-warms the YouTube IFrame API. Player hosts are owned by
 * youtubeCuePlayer (imperative DOM) so React re-renders never wipe iframes.
 */
export function YoutubeCueLayer() {
  useEffect(() => {
    void loadYoutubeIframeApi().catch(() => {
      /* Connect / Play will surface errors */
    });
  }, []);

  return null;
}
