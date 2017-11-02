import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class extends Component {

  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
    onToggle: PropTypes.func,
    showSidebar: PropTypes.bool,
    width: PropTypes.string,
  }

  static defaultProps = {
    children: null,
    onToggle: {},
    showSidebar: true,
    width: '15rem',
  }

  render() {
    const { onToggle, showSidebar, width, children } = this.props;
    const className = `sidebar ${showSidebar ? 'open' : 'closed'}`;
    const onClick = () => onToggle(!showSidebar);

    return (
      <div className={className} style={{ width }}>
        <button className="btn btn-default" onClick={onClick}>{showSidebar ? '◀' : '▶'}</button>
        <div className="sidebar-content">
          {children}
        </div>
      </div>
    );
  }

}
