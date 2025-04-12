import React, { useState, useCallback } from "react";
import "./App.css";

import Playlist from "../Playlist/Playlist";
import SearchBar from "../SearchBar/SearchBar";
import SearchResults from "../SearchResults/SearchResults";
import Spotify from "../../util/Spotify";

const App = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [playlistName, setPlaylistName] = useState('New Playlist');
  const [playlistTracks, setPlaylistTracks] = useState([]);

  const search = useCallback(async (term) => {
    try {
      const results = await Spotify.search(term);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, []);
  
  const addTrack = useCallback((track) => {
    // Prevent duplicate tracks by checking IDs
    if (playlistTracks.some(savedTrack => savedTrack.id === track.id)) {
      return;
    }
    
    setPlaylistTracks(prevTracks => [...prevTracks, track]);
  }, [playlistTracks]);

  const removeTrack = useCallback((track) => {
    setPlaylistTracks(prevTracks => 
      prevTracks.filter(currentTrack => currentTrack.id !== track.id)
    );
  }, []);

  const updatePlaylistName = useCallback((name) => {
    setPlaylistName(name);
  }, []);

  const savePlaylist = useCallback(async () => {
    // Get array of URIs from the playlist tracks
    const trackUris = playlistTracks.map(track => track.uri);
    
    if (!trackUris.length) {
      alert('Please add tracks to your playlist before saving');
      return;
    }
    
    try {
      await Spotify.savePlaylist(playlistName, trackUris);
      // Reset the playlist after successful save
      setPlaylistName('New Playlist');
      setPlaylistTracks([]);
      setSearchResults([]);
    } catch (error) {
      console.error('Error saving playlist:', error);
    }
  }, [playlistName, playlistTracks]);



  return (
    <div className="App">
    <header>
      <h1>Ja<span className="highlight">mmm</span>ing</h1>
    </header>
    <div className="App-content">
      <SearchBar onSearch={search} />
      <div className="App-playlist">
        <SearchResults 
          searchResults={searchResults} 
          onAdd={addTrack} 
        />
        <Playlist 
          playlistName={playlistName} 
          playlistTracks={playlistTracks}
          onNameChange={updatePlaylistName}
          onRemove={removeTrack}
          onSave={savePlaylist}
        />
      </div>
    </div>
  </div>
  )
};

export default App;
