import 'tawian-frontend';
import 'typeface-cousine';
import React from 'react';
import ReactDOM from 'react-dom';
import Keycloak from 'keycloak-js'
import App from 'containers/App';
// import registerServiceWorker from 'utils/registerServiceWorker';
import 'index.css';
import 'dygraph.css';

import { KeycloakContext } from './constants'
import { doAsclepiosUpload } from './config'


if (doAsclepiosUpload) {
    let keycloak = new Keycloak({
        url: `${process.env.REACT_APP_KEYCLOAK_HOST}/auth`,
        realm: 'snet',
        clientId: 'sn-editor',
    });

    keycloak.init({onLoad: 'login-required'}).then(function(authenticated) {
        ReactDOM.render(
            <KeycloakContext.Provider value={keycloak}> 
                <App />
            </KeycloakContext.Provider>,
            document.getElementById('app')
        );
    }).catch(function() {
        alert('failed to initialize');
    });
} else {
    ReactDOM.render(<App />, document.getElementById('app'));
}

// registerServiceWorker();
