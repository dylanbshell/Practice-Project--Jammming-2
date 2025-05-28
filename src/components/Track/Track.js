import React, { useCallback } from "react";

import "./Track.css";

const Track = (props) => {
    // Memoized callback for adding a track
  const handleAddTrack = useCallback(() => {
    props.onAdd(props.track);
  }, [props.onAdd, props.track]);

  // Memoized callback for removing a track
  const handleRemoveTrack = useCallback(() => {
    props.onRemove(props.track);
  }, [props.onRemove, props.track]);
  
  // Function to render the correct button
  const renderAction = () => {
    if (props.isRemoval) {
      return <button className="Track-action" onClick={handleRemoveTrack}>-</button>;
    } else {
      return <button className="Track-action" onClick={handleAddTrack}>+</button>;
    }
  };
  
  return (
    <div className="Track">
      <div className="Track-information">
        <h3>{props.track.name}</h3>
        <p>{props.track.artist} | {props.track.album}</p>
      </div>
      {renderAction()}
    </div>
  );
};

console.log('Track preview data:', {
  name: props.track.name,
  hasPreviewUrl: !!props.track.preview_url,
  previewUrl: props.track.preview_url
});

export default Track;
