import React, { useState, useCallback, useMemo, useEffect } from "react";
import "./App.css";

import Playlist from "../Playlist/Playlist";
import SearchBar from "../SearchBar/SearchBar";
import SearchResults from "../SearchResults/SearchResults";
import Spotify from "../../util/Spotify";

const App = () => {

  //Manage & save state of search results
  const [searchResults, setSearchResults] = useState(() => {
    try {
      const savedSearchResults = localStorage.getItem('searchResults');
      return savedSearchResults ? JSON.parse(savedSearchResults) : [];
    } catch (error) {
      console.error('Error loading saved search results:', error);
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem('searchResults', JSON.stringify(searchResults));
  }, [searchResults]);
  
  
  //Manage & save state of playlistName
  const [playlistName, setPlaylistName] = useState(() => {
    try {
      const savedPlaylistName = localStorage.getItem('playlistName');
      return savedPlaylistName ? JSON.parse(savedPlaylistName) : 'New Playlist';
    } catch (error) {
      console.error('Error loading saved playlist name:', error);
      return 'New Playlist';
    }
  });
  useEffect(() => {
    localStorage.setItem('playlistName', JSON.stringify(playlistName));
  }, [playlistName]);
  
  //Manage & save state of playlist tracks
  const [playlistTracks, setPlaylistTracks] = useState(() => {
    try {
      const savedTracks = localStorage.getItem('playlistTracks');
      return savedTracks ? JSON.parse(savedTracks) : [];
    } catch (error) {
      console.error('Error loading saved tracks:', error);
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem('playlistTracks', JSON.stringify(playlistTracks));
  }, [playlistTracks]);



  const search = useCallback(async (term) => {
    try {
      const results = await Spotify.search(term);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, []);

  // Filter search results to exclude tracks already in playlist
  const filteredSearchResults = useMemo(() => {
    return searchResults.filter(searchTrack => 
      !playlistTracks.some(playlistTrack => playlistTrack.id === searchTrack.id)
    );
  }, [searchResults, playlistTracks]);
  
  const addTrack = useCallback((track) => {
    // Prevent duplicate tracks by checking IDs
    if (playlistTracks.some(savedTrack => savedTrack.id === track.id)) {
      return;
    }
    
    setPlaylistTracks(prevTracks => [...prevTracks, track]);
  }, [playlistTracks]);

  const removeTrack = useCallback((track) => {
    //setSearchResults(prevResults => [...prevResults, track]);
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
          searchResults={filteredSearchResults} 
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