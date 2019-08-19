import React from 'react';
import PropTypes from 'prop-types';

const Pointer = ({ position }) => {
  if (!position) return null;
  const style = {
    transform: `translate3d(${position.absX}px, ${position.absY}px, 0)`,
  };
  return <span className="pointer" style={style} />;
};

Pointer.propTypes = { position: PropTypes.object };
Pointer.defaultProps = { position: null };

export default Pointer;
