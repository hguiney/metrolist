import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';

import App from './components/App';
import * as serviceWorker from './serviceWorker';

import '@globals/util.scss';

ReactDOM.render(
  <Router basename="/metrolist">
    <App />
  </Router>,
  document.getElementById( 'web-app' ),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
