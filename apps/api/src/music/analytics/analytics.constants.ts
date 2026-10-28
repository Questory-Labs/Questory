import { LASTFM_SUBMISSION_CLIENT } from "../scrobbler/scrobbler.constants";

/** Server-side cap on top-N lists returned by music analytics endpoints. */

/** Top tracks / top albums shown on an artist detail page. */
export const ARTIST_TOP_ITEMS_LIMIT = 10;

/** Top tracks shown on an album detail page. */
export const ALBUM_TOP_TRACKS_LIMIT = 25;

/** Top moods shown on artist/album detail pages. */
export const TOP_MOODS_LIMIT = 10;

export const LISTEN_SOURCE_LASTFM_CLIENTS = [LASTFM_SUBMISSION_CLIENT] as const;

export const LISTEN_SOURCE_IMPORT_CLIENT_SUFFIX = "_import";

export const MOVERS_CONCENTRATION_TOP_N = 10;

export const MOVERS_RANK_WINDOW = 50;

export const MOVERS_DEFAULT_LIMIT = 5;

export const MOVERS_MAX_LIMIT = 20;
