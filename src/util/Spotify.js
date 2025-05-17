// Spotify.js - Utility for Spotify API Authentication and Requests

// Get credentials and configuration from environment variables
const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const redirectUri = process.env.REACT_APP_SPOTIFY_REDIRECT_URI;
const authEndpoint = process.env.REACT_APP_SPOTIFY_AUTH_ENDPOINT;
const apiBaseUrl = process.env.REACT_APP_SPOTIFY_API_BASE_URL;
const scope = process.env.REACT_APP_SPOTIFY_SCOPE;
const responseType = process.env.REACT_APP_SPOTIFY_RESPONSE_TYPE;

const Spotify = {
  // Property to store the access token
  accessToken: '',
  
  // Method to get the access token
  getAccessToken() {
    // Check if we already have an access token
    if (this.accessToken) {
      return this.accessToken;
    }
    
    // Check the URL for an access token and expiration time
    const tokenMatch = window.location.href.match(/access_token=([^&]*)/);
    const expiresMatch = window.location.href.match(/expires_in=([^&]*)/);
    
    // If we find both in the URL, set the access token and expiration time
    if (tokenMatch && expiresMatch) {
      this.accessToken = tokenMatch[1];
      const expiresIn = Number(expiresMatch[1]);
      
      // Clear the token after it expires
      window.setTimeout(() => this.accessToken = '', expiresIn * 1000);
      
      // Clear the parameters from the URL
      window.history.pushState('Access Token', null, '/');
      return this.accessToken;
    } else {
      // If no token found, redirect to Spotify authorization URL
      window.location = `${authEndpoint}?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      return null; // This line won't execute due to redirect, but keeps function signature consistent
    }
  },
  
  // Method to search for tracks
  async search(term) {
    // Ensure we have an access token
    const accessToken = this.getAccessToken();
    
    // Return early if we don't have a token (this happens on the first call when we redirect)
    if (!accessToken) return [];
    
    // Make a request to the Spotify API search endpoint
    try {
      const response = await fetch(`${apiBaseUrl}/search?type=track&q=${encodeURIComponent(term)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Search request failed with status ${response.status}`);
      }
      
      const jsonResponse = await response.json();
      
      // If there are no tracks, return an empty array
      if (!jsonResponse.tracks) {
        return [];
      }
      
      // Map the response to a simpler format that our app can use
      return jsonResponse.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        uri: track.uri
      }));
    } catch (error) {
      console.error('Error searching tracks:', error);
      return [];
    }
  },
  
  // Method to save a playlist to the user's Spotify account
  async savePlaylist(name, trackURIs) {
    // If there's no name or no tracks, return early
    if (!name || !trackURIs.length) {
      return;
    }
    
    // Ensure we have an access token
    const accessToken = this.getAccessToken();
    const headers = { 
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    try {
      // First, get the user's Spotify ID
      const userResponse = await fetch(`${apiBaseUrl}/me`, { headers });
      
      if (!userResponse.ok) {
        throw new Error(`User profile request failed with status ${userResponse.status}`);
      }
      
      const userJson = await userResponse.json();
      const userId = userJson.id;
      
      // Then, create a new playlist
      const playlistResponse = await fetch(`${apiBaseUrl}/users/${userId}/playlists`, {
        headers,
        method: 'POST',
        body: JSON.stringify({ name })
      });
      
      if (!playlistResponse.ok) {
        throw new Error(`Create playlist request failed with status ${playlistResponse.status}`);
      }
      
      const playlistJson = await playlistResponse.json();
      const playlistId = playlistJson.id;
      
      // Finally, add the tracks to the playlist
      const addTracksResponse = await fetch(`${apiBaseUrl}/playlists/${playlistId}/tracks`, {
        headers,
        method: 'POST',
        body: JSON.stringify({ uris: trackURIs })
      });
      
      if (!addTracksResponse.ok) {
        throw new Error(`Add tracks request failed with status ${addTracksResponse.status}`);
      }
      
      return await addTracksResponse.json();
    } catch (error) {
      console.error('Error saving playlist:', error);
      throw error;
    }
  }
};

export default Spotify;