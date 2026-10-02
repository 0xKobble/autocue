import { useEffect } from "react";
import { loadSoundcloudWidgetApi } from "../audio/soundcloudCuePlayer";

/**
 * Pre-warms the SoundCloud Widget API. Player hosts are owned by
 * soundcloudCuePlayer (imperative DOM) so React re-renders never wipe iframes.
 */
export function SoundcloudCueLayer() {
  useEffect(() => {
    void loadSoundcloudWidgetApi().catch(() => {
      /* Connect / Play will surface errors */
    });
  }, []);

  return null;
}
