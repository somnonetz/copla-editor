import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Bundle from 'components/Bundle';

export default class extends Component {

  static propTypes = {
    bundles: PropTypes.array,
    onSelect: PropTypes.func,
    onToggle: PropTypes.func,
    showSidebar: PropTypes.bool,
  }

  static defaultProps = {
    bundles: [],
    onSelect: {},
    onToggle: {},
    showSidebar: true,
  }

  render() {
    const { bundles, onSelect, onToggle, showSidebar } = this.props;
    const onClick = () => onToggle(!showSidebar);
    return (
      <div className="file-browser">
        <button className="btn btn-default" onClick={onClick}>{showSidebar ? '◀' : '▶'}</button>
        <div style={{ overflow: 'hidden' }}>
          {bundles.map((bundle, i) =>
            <Bundle
              key={i}
              bundle={bundle}
              onSelect={onSelect}
            />
          )}
        </div>
      </div>
    );
  }

}
