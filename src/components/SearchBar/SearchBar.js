import React, { useState, useCallback } from "react";

import "./SearchBar.css";

const SearchBar = (props) => {
  const [term, setTerm] = useState('');

  const handleTermChange = useCallback((event) => {
    setTerm(event.target.value);
  }, []);

  const handleSearch = useCallback(() => {
    props.onSearch(term);
  }, [props.onSearch, term]);

  return (
    <div className="SearchBar">
      <input 
        type="text" 
        placeholder="Enter A Song, Album, or Artist" 
        onChange={handleTermChange}
        value={term}
      />
      <button className="SearchButton" onClick={handleSearch}>
        SEARCH
      </button>
    </div>
  );
};

export default SearchBar;
