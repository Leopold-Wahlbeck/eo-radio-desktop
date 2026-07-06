import { UserFacingError } from "./errors.js";
import { AppSettings, RadioTrack } from "./models.js";
import { normalizeTrackText } from "./textUtils.js";

interface PlaylistPage {
  items: Array<{
    track: null | {
      type: string;
      is_local?: boolean;
      name?: string;
      artists?: Array<{ name?: string }>;
    };
  }>;
  next: string | null;
}

export async function getPlaylistTracks(settings: AppSettings): Promise<RadioTrack[]> {
  validateSpotifySettings(settings);
  const token = await getToken(settings);
  const playlistId = extractPlaylistId(settings.spotifyPlaylistId);
  let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=${encodeURIComponent(settings.spotifyMarket)}&limit=100`;
  const tracks: RadioTrack[] = [];

  while (url) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!response.ok) {
      await throwPlaylistError(response);
    }

    const page = await response.json() as PlaylistPage;

    for (const item of page.items ?? []) {
      const track = item.track;
      if (!track || track.type !== "track" || track.is_local || !track.name || !track.artists?.length) continue;
      const artists = track.artists.map((artist) => artist.name?.trim()).filter(Boolean) as string[];
      if (!artists.length) continue;

      tracks.push({
        index: tracks.length + 1,
        artist: normalizeTrackText(joinArtists(artists)),
        title: normalizeTrackText(track.name)
      });
    }

    url = page.next;
  }

  if (!tracks.length) {
    throw new UserFacingError("Spellistan innehåller inga tillgängliga låtar.");
  }

  return tracks;
}

function validateSpotifySettings(settings: AppSettings) {
  if (!settings.spotifyClientId.trim()) throw new UserFacingError("Spotify Client ID saknas. Öppna Inställningar och fyll i din API-nyckel.");
  if (!settings.spotifyClientSecret.trim()) throw new UserFacingError("Spotify Client Secret saknas. Öppna Inställningar och fyll i din API-hemlighet.");
  if (!settings.spotifyPlaylistId.trim()) throw new UserFacingError("Spotify-spellista saknas. Klistra in playlist-länken eller dess ID.");
}

async function getToken(settings: AppSettings): Promise<string> {
  const authorization = Buffer.from(`${settings.spotifyClientId.trim()}:${settings.spotifyClientSecret.trim()}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ grant_type: "client_credentials" })
  });

  if (!response.ok) {
    throw new UserFacingError("Spotify kunde inte godkänna API-nycklarna. Kontrollera Client ID och Client Secret.");
  }

  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new UserFacingError("Spotify returnerade ingen access token.");
  return data.access_token;
}

function extractPlaylistId(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/playlist\/([A-Za-z0-9]+)/);
  const id = match?.[1] ?? trimmed.split("?")[0];
  if (!/^[A-Za-z0-9]+$/.test(id)) throw new UserFacingError("Spotify-spellistans länk eller ID är ogiltigt.");
  return id;
}

function joinArtists(artists: string[]): string {
  if (artists.length === 1) return artists[0];
  if (artists.length === 2) return artists.join(" & ");
  return artists.join(", ");
}

async function throwPlaylistError(response: Response): Promise<never> {
  if (response.status === 403) throw new UserFacingError("Spotify nekade åtkomst. Kontrollera att spellistan är publik och att Spotify-appen har åtkomst.");
  if (response.status === 404) throw new UserFacingError("Spotify-spellistan hittades inte. Kontrollera länken eller playlist-ID:t.");
  throw new UserFacingError(`Spotify kunde inte läsa spellistan (${response.status}).`);
}
