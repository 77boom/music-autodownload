import { describe, expect, it, vi } from 'vitest';
import {
  SPOTIFY_USER_LIBRARY_SCOPE,
  buildSpotifyAuthorizationUrl,
  fetchSavedTracks,
  mapSavedTrackItem
} from './spotify';
import type { SpotifySavedTrack } from './spotify';

const savedTrack: SpotifySavedTrack = {
  added_at: '2026-07-03T12:00:00Z',
  track: {
    id: 'spotify-track-id',
    uri: 'spotify:track:spotify-track-id',
    name: 'Example Song',
    duration_ms: 213000,
    external_ids: { isrc: 'USRC17607839' },
    external_urls: { spotify: 'https://open.spotify.com/track/spotify-track-id' },
    artists: [{ name: 'Example Artist' }],
    album: {
      name: 'Example Album',
      images: [{ url: 'https://i.scdn.co/image/example' }]
    }
  }
};

describe('Spotify metadata helpers', () => {
  it('builds a PKCE authorization URL for the saved-track scope without a client secret', () => {
    const url = new URL(
      buildSpotifyAuthorizationUrl({
        clientId: 'client-id',
        redirectUri: 'http://127.0.0.1:43888/callback',
        state: 'state-token',
        codeChallenge: 'pkce-code-challenge'
      })
    );

    expect(url.origin).toBe('https://accounts.spotify.com');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('scope')).toBe(SPOTIFY_USER_LIBRARY_SCOPE);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe('pkce-code-challenge');
    expect(url.searchParams.has('client_secret')).toBe(false);
  });

  it('maps Spotify saved-track metadata into the app track shape', () => {
    expect(mapSavedTrackItem(savedTrack)).toEqual({
      id: 'spotify-track-id',
      uri: 'spotify:track:spotify-track-id',
      title: 'Example Song',
      artists: ['Example Artist'],
      album: 'Example Album',
      durationMs: 213000,
      isrc: 'USRC17607839',
      spotifyUrl: 'https://open.spotify.com/track/spotify-track-id',
      artworkUrl: 'https://i.scdn.co/image/example',
      addedAt: '2026-07-03T12:00:00Z'
    });
  });

  it('reads all saved-track pages using the bearer access token', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [savedTrack],
            next: 'https://api.spotify.com/v1/me/tracks?offset=50&limit=50'
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ ...savedTrack, track: { ...savedTrack.track, id: 'second-id' } }],
            next: null
          })
        )
      );

    const tracks = await fetchSavedTracks(
      {
        accessToken: 'access-token',
        expiresAt: Date.now() + 3600_000
      },
      fetchImpl
    );

    expect(tracks.map((track) => track.id)).toEqual(['spotify-track-id', 'second-id']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.spotify.com/v1/me/tracks?limit=50',
      expect.objectContaining({
        headers: { Authorization: 'Bearer access-token' }
      })
    );
  });
});
