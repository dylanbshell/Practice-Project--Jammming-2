import React, { useState, useCallback, useEffect } from "react";

import "./SearchBar.css";

const SearchBar = (props) => {

  //Manage & save state of search term
  const [term, setTerm] = useState(() => {
      try {
        const savedTerm = localStorage.getItem('term');
        return savedTerm ? JSON.parse(savedTerm) : '';
      } catch (error) {
        console.error('Error loading saved term:', error);
        return '';
      }
    });
    useEffect(() => {
      localStorage.setItem('term', JSON.stringify(term));
    }, [term]);


  const handleTermChange = useCallback((event) => {
    setTerm(event.target.value);
  }, []);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    props.onSearch(term);
  }, [props.onSearch, term]);

  return (
    <form className="SearchBar" onSubmit={handleSubmit}>
      <input 
        type="text" 
        placeholder="Enter A Song, Album, or Artist" 
        onChange={handleTermChange}
        value={term}
        name="SearchBar"
      />
      <button type="submit" className="SearchButton">
        SEARCH
      </button>
    </form>
  );
};

export default SearchBar;
