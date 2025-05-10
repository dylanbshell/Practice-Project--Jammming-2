const clientId = ''; // Insert client ID here.
const redirectUri = 'http://localhost:3000/'; // Have to add this to your accepted Spotify redirect URIs on the Spotify API.
let accessToken;


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
        // If not, redirect to Spotify authorization URL
        const clientID = 'YOUR_CLIENT_ID'; // Replace with your actual Spotify client ID
        const redirectURI = 'YOUR_REDIRECT_URI'; // Replace with your actual redirect URI
        const scope = 'playlist-modify-public';
        
        window.location = `https://accounts.spotify.com/authorize?client_id=${clientID}&response_type=token&scope=${scope}&redirect_uri=${redirectURI}`;
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
        const response = await fetch(`https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(term)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
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
      const headers = { Authorization: `Bearer ${accessToken}` };
      let userID;
      
      // First, get the user's Spotify ID
      try {
        const response = await fetch('https://api.spotify.com/v1/me', { headers });
        const jsonResponse = await response.json();
        userID = jsonResponse.id;
        
        // Then, create a new playlist
        const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userID}/playlists`, {
          headers,
          method: 'POST',
          body: JSON.stringify({ name })
        });
        
        const playlistJSON = await playlistResponse.json();
        const playlistID = playlistJSON.id;
        
        // Finally, add the tracks to the playlist
        return fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks`, {
          headers,
          method: 'POST',
          body: JSON.stringify({ uris: trackURIs })
        });
      } catch (error) {
        console.error('Error saving playlist:', error);
        throw error;
      }
    }
  };
  
  export default Spotify;
