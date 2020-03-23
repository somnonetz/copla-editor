import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Bundle from 'components/Bundle';

export default class FileBrowser extends Component {

  static propTypes = {
    bundles: PropTypes.array,
    canUpload: PropTypes.bool,
    onSelect: PropTypes.func,
    onUpload: PropTypes.func,
  }

  static defaultProps = {
    bundles: [],
    canUpload: false,
    onSelect: {},
    onUpload: {},
  }

  render() {
    const { bundles, onSelect, onUpload, canUpload } = this.props;
    return (
      <div className="file-browser">
        {bundles.map(bundle =>
          <Bundle
            key={bundle.edf.file.name}
            bundle={bundle}
            canUpload={canUpload}
            onSelect={onSelect}
            onUpload={onUpload}
          />
        )}
        {/*bundles.filter(b => b.isLocal).length >= 2 &&
          <button className="btn btn-primary full-width m-t-1" onClick={console.log}>Upload all</button>
        */}
      </div>
    );
  }

}
