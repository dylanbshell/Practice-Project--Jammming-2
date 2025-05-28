// Spotify.js - PKCE Flow Implementation with Debug Logging
const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const redirectUri = process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000/';
const scopes = 'playlist-modify-public playlist-modify-private';

let accessToken;

// Debug logging for configuration
console.log('=== SPOTIFY CONFIGURATION DEBUG ===');
console.log('Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'MISSING');
console.log('Redirect URI:', redirectUri);
console.log('Current URL:', window.location.href);
console.log('Current Origin:', window.location.origin);
console.log('Current Pathname:', window.location.pathname);
console.log('======================================');

// Generate cryptographically secure random string for code verifier
const generateCodeVerifier = () => {
  const array = new Uint32Array(32);
  window.crypto.getRandomValues(array);
  const verifier = Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  return verifier;
};

// Generate SHA256 hash of code verifier for code challenge
const generateCodeChallenge = async (verifier) => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    
    // Convert to base64url encoding
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return challenge;
  } catch (error) {
    throw error;
  }
};

// Get access token using PKCE flow
const getAccessToken = async () => {
  // Check for missing configuration
  if (!clientId) {
    throw new Error('Spotify Client ID is missing. Please check your .env file.');
  }
  
  // Return existing token if available
  if (accessToken) {
    return accessToken;
  }

  // Check if we're returning from authorization with a code
  const urlParams = new URLSearchParams(window.location.search);
  const authorizationCode = urlParams.get('code');
  const error = urlParams.get('error');
  const errorDescription = urlParams.get('error_description');
  
  if (error) {
    throw new Error(`Spotify authorization error: ${error} - ${errorDescription}`);
  }
  
  if (authorizationCode) {
    // Exchange authorization code for access token
    try {
      const token = await exchangeCodeForToken(authorizationCode);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    } catch (error) {
      // Clear any stored verifier and restart flow
      sessionStorage.removeItem('code_verifier');
      return initiateAuthFlow();
    }
  }

  // Check for existing token in session storage
  const storedToken = sessionStorage.getItem('spotify_access_token');
  const tokenExpiry = sessionStorage.getItem('spotify_token_expiry');
  
  if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
    accessToken = storedToken;
    return accessToken;
  }

  // No valid token found, initiate authorization flow
  return initiateAuthFlow();
};

// Initiate PKCE authorization flow
const initiateAuthFlow = async () => {
  try {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later exchange
    sessionStorage.setItem('code_verifier', codeVerifier);
    
    // Build authorization URL with PKCE parameters
    const authParams = {
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      scope: scopes,
      show_dialog: 'true' // Forces user to see authorization dialog
    };
    
    const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams(authParams);
    
    // Redirect to Spotify authorization
    window.location.href = authUrl;
  } catch (error) {
    throw error;
  }
};

// Exchange authorization code for access token
const exchangeCodeForToken = async (code) => {
  const codeVerifier = sessionStorage.getItem('code_verifier');
  
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the authorization process.');
  }

  try {
    const tokenParams = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier, // PKCE verification instead of client_secret
    };
    
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenParams),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
    }

    const data = await response.json();
    
    // Store token and expiry time
    accessToken = data.access_token;
    const expiryTime = Date.now() + (data.expires_in * 1000);
    
    sessionStorage.setItem('spotify_access_token', accessToken);
    sessionStorage.setItem('spotify_token_expiry', expiryTime.toString());
    
    // Clean up code verifier
    sessionStorage.removeItem('code_verifier');
    
    return accessToken;
  } catch (error) {
    sessionStorage.removeItem('code_verifier');
    throw error;
  }
};

// Search for tracks using Spotify Web API
const search = async (term) => {
  try {
    const token = await getAccessToken();
    
    const searchUrl = `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(term)}&market=US&limit=20`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, clear stored token and retry
        sessionStorage.removeItem('spotify_access_token');
        sessionStorage.removeItem('spotify_token_expiry');
        accessToken = null;
        throw new Error('Authentication expired. Please refresh the page to re-authenticate.');
      }
      const errorData = await response.text();
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw Spotify response:', data.tracks.items[0]); // Log first track

    if (!data.tracks || !data.tracks.items) {
      return [];
    }

    // Transform Spotify track data to match your app's format
    const transformedTracks = data.tracks.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      album: track.album?.name || 'Unknown Album',
      uri: track.uri,
      preview_url: track.preview_url,
      external_urls: track.external_urls,
    }));
    
    return transformedTracks;
  } catch (error) {
    throw error;
  }
};

// Get current user's Spotify profile
const getCurrentUser = async () => {
  try {
    const token = await getAccessToken();
    
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
    }

    const userData = await response.json();
    
    return userData;
  } catch (error) {
    throw error;
  }
};

// Save playlist to user's Spotify account
const savePlaylist = async (playlistName, trackUris) => {
  if (!playlistName || !trackUris || trackUris.length === 0) {
    throw new Error('Playlist name and tracks are required');
  }

  try {
    const token = await getAccessToken();
    const user = await getCurrentUser();

    // Create playlist
    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playlistName,
        description: `Created with Jammming - ${new Date().toLocaleDateString()}`,
        public: false, // Private by default for user privacy
      }),
    });

    if (!createPlaylistResponse.ok) {
      const errorData = await createPlaylistResponse.text();
      throw new Error(`Failed to create playlist: ${createPlaylistResponse.status} ${createPlaylistResponse.statusText}`);
    }

    const playlistData = await createPlaylistResponse.json();

    // Add tracks to playlist (Spotify allows up to 100 tracks per request)
    const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: trackUris,
      }),
    });

    if (!addTracksResponse.ok) {
      const errorData = await addTracksResponse.text();
      throw new Error(`Failed to add tracks to playlist: ${addTracksResponse.status} ${addTracksResponse.statusText}`);
    }
    
    return playlistData;
  } catch (error) {
    throw error;
  }
};

// Logout function to clear stored tokens
const logout = () => {
  accessToken = null;
  sessionStorage.removeItem('spotify_access_token');
  sessionStorage.removeItem('spotify_token_expiry');
  sessionStorage.removeItem('code_verifier');
};

// Export all functions for use in components
const Spotify = {
  getAccessToken,
  search,
  savePlaylist,
  getCurrentUser,
  logout,
};

export default Spotify;