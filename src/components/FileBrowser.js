import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Bundle from 'components/Bundle';

export default class extends Component {

  static propTypes = {
    bundles: PropTypes.array,
    onSelect: PropTypes.func,
    onUpload: PropTypes.func,
  }

  static defaultProps = {
    bundles: [],
    onSelect: {},
    onUpload: {},
  }

  render() {
    const { bundles, onSelect, onUpload } = this.props;
    return (
      <div className="file-browser">
        {bundles.map(bundle =>
          <Bundle
            key={bundle.edf.filename}
            bundle={bundle}
            onSelect={onSelect}
            onUpload={onUpload}
          />
        )}
      </div>
    );
  }

}
