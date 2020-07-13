import { useLocation } from 'react-router-dom';
import { formatPageTitle } from '@util/strings';
import OnDemandLiveRegion from 'on-demand-live-region';
import { getGlobalThis } from '@util/objects';

const globalThis = getGlobalThis();

// Accessibility and Search Engine Optimization
export function updatePageTitle( pageTitle, sectionTitle ) {
  const formattedPageTitle = formatPageTitle( pageTitle, sectionTitle );
  const liveRegion = new OnDemandLiveRegion( {
    "level": 'assertive',
  } );

  document.title = formattedPageTitle;
  liveRegion.say( formattedPageTitle );
}

export function handlePseudoButtonKeyDown( event, triggerClick = false ) {
  if ( event.key === " " || event.key === "Enter" || event.key === "Spacebar" ) { // "Spacebar" for IE11 support
    // Prevent the default action to stop scrolling when space is pressed
    event.preventDefault();

    if ( triggerClick ) {
      event.target.click();
    }
  }
}

export function isOnGoogleTranslate() {
  return (
    ( globalThis.location.hostname === 'translate.googleusercontent.com' )
    || ( globalThis.location.hostname === 'translate.google.com' )
    || ( globalThis.location.pathname === '/translate_c' )
  );
}

export function copyGoogleTranslateParametersToNewUrl( url ) {
  let newUrl = '';
  const isBeingTranslated = isOnGoogleTranslate();

  if ( isBeingTranslated ) {
    const metrolistGoogleTranslateUrl = localStorage.getItem( 'metrolistGoogleTranslateUrl' );

    if ( metrolistGoogleTranslateUrl ) {
      newUrl = metrolistGoogleTranslateUrl.replace(
        /([a-z]+=)(https?:\/\/[^/]+\/metrolist\/.*)/i,
        `$1${url}`,
      );
    } else {
      console.error( 'Could not find `metrolistGoogleTranslateUrl` in localStorage' );
    }
  } else {
    console.error( 'Google Translate URL not detected (checked for translate.googleusercontent.com, translate.google.com, and /translate_c). Can not copy query parameters to new Google Translate URL.' );
  }

  return newUrl;
}

// Fix for Google Translate iframe shenanigans
// @location - React Router useLocation instance
export function resolveLocationConsideringGoogleTranslate() {
  const location = useLocation();
  const isBeingTranslated = isOnGoogleTranslate();
  let resolvedUrlPath = location.pathname;

  if ( isBeingTranslated && location.search.length ) {
    const filteredQueryParameters = location.search.split( '&' ).filter( ( urlParameter ) => urlParameter.indexOf( '/metrolist/' ) !== -1 );

    if ( filteredQueryParameters.length ) {
      const metrolistUrlBeingTranslated = filteredQueryParameters[0].replace( /[a-z]+=https?:\/\/[^/]+(\/metrolist\/.*)/i, '$1' );

      resolvedUrlPath = metrolistUrlBeingTranslated;

      localStorage.setItem( 'metrolistGoogleTranslateUrl', globalThis.location.href );
      localStorage.setItem( 'metrolistGoogleTranslateIframeUrl', document.location.href );
    }
  }

  return {
    ...location,
    "pathname": resolvedUrlPath,
  };
}
