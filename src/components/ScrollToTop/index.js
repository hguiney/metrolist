import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect( () => {
    console.log( 'scrolled to top' );
    window.scrollTo( 0, 0 );
  }, [pathname] );

  return null;
}

ScrollToTop.displayName = 'ScrollToTop';

// ScrollToTop.propTypes = {};

export default ScrollToTop;
