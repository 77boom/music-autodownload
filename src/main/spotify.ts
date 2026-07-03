import { randomBytes, createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { shell } from 'electron';
import type { LikedTrack, SpotifyTokenSet } from '../shared/types';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
export const SPOTIFY_USER_LIBRARY_SCOPE = 'user-library-read';

type CallbackResult = {
  code: string;
  state: string;
};

export async function connectSpotifyWithPkce(
  clientId: string,
  redirectUri: string
): Promise<SpotifyTokenSet> {
  assertSpotifyAuthInput(clientId, redirectUri);
  const verifier = base64Url(randomBytes(64));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  const state = base64Url(randomBytes(24));
  const callbackPromise = waitForCallback(redirectUri);
  const authUrl = buildSpotifyAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge: challenge
  });

  await shell.openExternal(authUrl);
  const callback = await callbackPromise;
  if (callback.state !== state) {
    throw new Error('Spotify authorization state did not match.');
  }

  return exchangeCodeForToken(clientId, redirectUri, callback.code, verifier);
}

export function buildSpotifyAuthorizationUrl({
  clientId,
  redirectUri,
  state,
  codeChallenge,
  scope = SPOTIFY_USER_LIBRARY_SCOPE
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
}): string {
  assertSpotifyAuthInput(clientId, redirectUri);
  const authUrl = new URL(SPOTIFY_AUTH_URL);

  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', codeChallenge);

  return authUrl.toString();
}

export async function refreshSpotifyToken(
  clientId: string,
  refreshToken: string
): Promise<SpotifyTokenSet> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId
  });
  const token = await requestToken(body);
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? refreshToken,
    expiresAt: Date.now() + token.expires_in * 1000,
    scope: token.scope
  };
}

export async function fetchSavedTracks(
  token: SpotifyTokenSet,
  fetchImpl: typeof fetch = fetch
): Promise<LikedTrack[]> {
  const tracks: LikedTrack[] = [];
  let nextUrl: string | null = `${SPOTIFY_API_URL}/me/tracks?limit=50`;

  while (nextUrl) {
    const response = await fetchImpl(nextUrl, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Spotify saved tracks request failed: HTTP ${response.status}`);
    }

    const page = (await response.json()) as SpotifySavedTracksPage;
    for (const item of page.items) {
      tracks.push(mapSavedTrackItem(item));
    }
    nextUrl = page.next;
  }

  return tracks;
}

async function exchangeCodeForToken(
  clientId: string,
  redirectUri: string,
  code: string,
  verifier: string
): Promise<SpotifyTokenSet> {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });
  const token = await requestToken(body);
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    scope: token.scope
  };
}

async function requestToken(body: URLSearchParams): Promise<SpotifyTokenResponse> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed: HTTP ${response.status}`);
  }

  return (await response.json()) as SpotifyTokenResponse;
}

function assertSpotifyAuthInput(clientId: string, redirectUri: string): void {
  if (!clientId.trim()) throw new Error('Spotify Client ID is required.');
  try {
    const parsed = new URL(redirectUri);
    if (!parsed.protocol.startsWith('http')) throw new Error();
  } catch {
    throw new Error('Spotify redirect URI must be a valid HTTP URL.');
  }
}

function waitForCallback(redirectUri: string): Promise<CallbackResult> {
  const redirect = new URL(redirectUri);
  const port = Number(redirect.port);
  const pathname = redirect.pathname;

  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      try {
        const callbackUrl = new URL(request.url ?? '/', redirectUri);
        if (callbackUrl.pathname !== pathname) {
          response.writeHead(404);
          response.end('Not found');
          return;
        }

        const error = callbackUrl.searchParams.get('error');
        if (error) {
          response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end('<p>Spotify authorization failed. You can close this tab.</p>');
          reject(new Error(`Spotify authorization failed: ${error}`));
          server.close();
          return;
        }

        const code = callbackUrl.searchParams.get('code');
        const state = callbackUrl.searchParams.get('state');
        if (!code || !state) {
          response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end('<p>Missing Spotify callback parameters. You can close this tab.</p>');
          reject(new Error('Spotify callback was missing code or state.'));
          server.close();
          return;
        }

        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<p>Spotify connected. You can close this tab and return to the app.</p>');
        resolve({ code, state });
        server.close();
      } catch (error) {
        reject(error);
        server.close();
      }
    });

    server.on('error', reject);
    server.listen(port, redirect.hostname);
  });
}

export function mapSavedTrackItem(item: SpotifySavedTrack): LikedTrack {
  const track = item.track;
  return {
    id: track.id,
    uri: track.uri,
    title: track.name,
    artists: track.artists.map((artist) => artist.name),
    album: track.album.name,
    durationMs: track.duration_ms,
    isrc: track.external_ids?.isrc,
    spotifyUrl: track.external_urls?.spotify,
    artworkUrl: track.album.images?.[0]?.url,
    addedAt: item.added_at
  };
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
};

export type SpotifySavedTracksPage = {
  items: SpotifySavedTrack[];
  next: string | null;
};

export type SpotifySavedTrack = {
  added_at: string;
  track: {
    id: string;
    uri: string;
    name: string;
    duration_ms: number;
    external_ids?: { isrc?: string };
    external_urls?: { spotify?: string };
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images?: Array<{ url: string }>;
    };
  };
};
