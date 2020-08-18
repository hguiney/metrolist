import './Search.scss';
import 'whatwg-fetch';

import React, { useEffect, useRef, useState } from 'react';
import {
  copyGoogleTranslateParametersToNewUrl,
  getUrlBeingTranslated,
  isOnGoogleTranslate,
} from '@util/translation';
import { filtersObject, homeObject } from '@util/validation';
import { getGlobalThis, hasOwnProperty, isPlainObject } from '@util/objects';
import { useHistory, useLocation } from 'react-router-dom';

import Callout from '@components/Callout';
import FiltersPanel from '@components/FiltersPanel';
import Inset from '@components/Inset';
import Link from '@components/Link';
import PropTypes from 'prop-types';
import ResultsPanel from '@components/ResultsPanel';
import Row from '@components/Row';
import Stack from '@components/Stack';
import { getDevelopmentsApiEndpoint } from '@util/dev';
import SearchPreferences from './_SearchPreferences';
import SearchPagination from './_SearchPagination';

const globalThis = getGlobalThis();
const apiEndpoint = getDevelopmentsApiEndpoint();

const defaultFilters = {
  "offer": {
    "rent": false,
    "sale": false,
  },
  "location": {
    "city": {
      "boston": false,
      "beyondBoston": false,
    },
    "neighborhood": {},
    "cardinalDirection": {
      "west": false,
      "north": false,
      "south": false,
    },
  },
  "bedrooms": {
    "0": false,
    "1": false,
    "2": false,
    "3+": false,
  },
  "amiQualification": {
    "lowerBound": 0,
    "upperBound": 200,
  },
  "incomeQualification": {
    "upperBound": null,
  },
  "rentalPrice": {
    "lowerBound": 0,
    "upperBound": 3000,
  },
};
const defaultFilterKeys = Object.keys( defaultFilters );

let savedFilters = localStorage.getItem( 'filters' );
if ( savedFilters ) {
  savedFilters = JSON.parse( savedFilters );

  // Sanitize localStorage values that might arise from testing/old releases
  if ( isPlainObject( savedFilters ) ) {
    Object.keys( savedFilters )
      .filter( ( savedFilterKey ) => defaultFilterKeys.indexOf( savedFilterKey ) === -1 )
      .forEach( ( errantKey ) => {
        delete savedFilters[errantKey];
      } );

    const savedNeighborhoods = savedFilters.location.neighborhood;
    savedFilters.location.neighborhood = {};
    Object.keys( savedNeighborhoods ).sort().forEach( ( nb ) => {
      savedFilters.location.neighborhood[nb] = savedNeighborhoods[nb];
    } );

    if ( hasOwnProperty( savedFilters.bedrooms, '3' ) ) {
      savedFilters.bedrooms['3+'] = savedFilters.bedrooms['3'];
      delete savedFilters.bedrooms['3'];
    }

    delete savedFilters.bedrooms['4+'];
  } else {
    savedFilters = {};
  }
} else {
  savedFilters = {};
}

let useAmiRecommendationAsLowerBound = localStorage.getItem( 'useAmiRecommendationAsLowerBound' );
if ( useAmiRecommendationAsLowerBound ) {
  useAmiRecommendationAsLowerBound = ( useAmiRecommendationAsLowerBound === 'true' );

  if ( useAmiRecommendationAsLowerBound ) {
    savedFilters.amiQualification = ( savedFilters.amiQualification || { "lowerBound": 0, "upperBound": null } );

    savedFilters.amiQualification.lowerBound = parseInt( localStorage.getItem( 'amiRecommendation' ), 10 );
    localStorage.setItem( 'useAmiRecommendationAsLowerBound', 'false' );
  }
}

// https://stackoverflow.com/a/11764168/214325
function paginate( homes, homesPerPage = 8 ) {
  const pages = [];
  let i = 0;
  const numberOfHomes = homes.length;

  while ( i < numberOfHomes ) {
    pages.push( homes.slice( i, i += homesPerPage ) );
  }

  return pages;
}

function getQuery( location ) {
  return new URLSearchParams( location.search );
}

function useQuery() {
  return new URLSearchParams( useLocation().search );
}

function getPage( location ) {
  return parseInt( getQuery( location ).get( 'page' ), 10 );
}

function filterHomes( homesToFilter, filtersToApply, matchOnNoneSelected = true ) {
  const matchingHomes = homesToFilter
    .filter( ( home ) => {
      let matchesOffer = (
        (
          ( filtersToApply.offer.rent !== false )
          && ( home.offer === 'rent' )
        )
        || (
          ( filtersToApply.offer.sale !== false )
          && ( home.offer === 'sale' )
        )
      );

      let matchesBroadLocation = (
        (
          ( filtersToApply.location.city.boston !== false )
          && ( home.cardinalDirection === null )
        )
        || (
          ( filtersToApply.location.city.beyondBoston !== false )
          && ( home.cardinalDirection !== null )
        )
      );

      let matchesNarrowLocation = (
        ( home.cardinalDirection === null )
          ? (
            hasOwnProperty( filtersToApply.location.neighborhood, home.neighborhood )
            && ( filtersToApply.location.neighborhood[home.neighborhood] === true )
          )
          : (
            hasOwnProperty( filtersToApply.location.cardinalDirection, home.cardinalDirection )
            && ( filtersToApply.location.cardinalDirection[home.cardinalDirection] === true )
          )
      );

      const unitBedroomSizes = home.units.map( ( unit ) => unit.bedrooms ).sort();
      let matchesBedrooms = (
        (
          ( filtersToApply.bedrooms['0'] === true )
          && ( unitBedroomSizes.indexOf( 0 ) !== -1 )
        )
        || (
          ( filtersToApply.bedrooms['1'] === true )
          && ( unitBedroomSizes.indexOf( 1 ) !== -1 )
        )
        || (
          ( filtersToApply.bedrooms['2'] === true )
          && ( unitBedroomSizes.indexOf( 2 ) !== -1 )
        )
        || (
          ( filtersToApply.bedrooms['3+'] === true )
          && ( unitBedroomSizes[unitBedroomSizes.length - 1] >= 3 )
        )
      );

      const dedupedAmi = new Set( home.units.map( ( unit ) => unit.amiQualification ) );
      const unitAmiQualifications = Array.from( dedupedAmi );
      let matchesAmiQualification;

      if ( home.incomeRestricted === false ) {
        matchesAmiQualification = true;
      } else {
        for ( let index = 0; index < unitAmiQualifications.length; index++ ) {
          const amiQualification = ( unitAmiQualifications[index] || null );

          if ( amiQualification === null ) {
            matchesAmiQualification = true;
            break;
          }

          if ( filtersToApply.amiQualification.lowerBound <= filtersToApply.amiQualification.upperBound ) {
            matchesAmiQualification = (
              ( amiQualification >= filtersToApply.amiQualification.lowerBound )
              && ( amiQualification <= filtersToApply.amiQualification.upperBound )
            );
          // These values can be switched in the UI causing the names to no longer be semantic
          } else if ( filtersToApply.amiQualification.lowerBound > filtersToApply.amiQualification.upperBound ) {
            matchesAmiQualification = (
              ( amiQualification >= filtersToApply.amiQualification.upperBound )
              && ( amiQualification <= filtersToApply.amiQualification.lowerBound )
            );
          }

          if ( matchesAmiQualification ) {
            break;
          }
        }
      }

      if ( matchOnNoneSelected ) {
        if ( !filtersToApply.offer.rent && !filtersToApply.offer.sale ) {
          matchesOffer = true;
        }

        if ( !filtersToApply.location.city.boston && !filtersToApply.location.city.beyondBoston ) {
          matchesBroadLocation = true;
          matchesNarrowLocation = true;
        }

        if (
          !filtersToApply.bedrooms['0']
          && !filtersToApply.bedrooms['1']
          && !filtersToApply.bedrooms['2']
          && !filtersToApply.bedrooms['3+']
        ) {
          matchesBedrooms = true;
        }
      }

      return (
        matchesOffer
        && matchesBroadLocation
        && matchesNarrowLocation
        && matchesBedrooms
        && matchesAmiQualification
      );
    } )
    .map( ( home ) => {
      const newUnits = home.units.filter( ( unit ) => {
        let unitMatchesRentalPrice;

        if (
          filtersToApply.rentalPrice.upperBound
          && (
            ( home.offer === 'rent' )
            || ( home.type === 'apt' )
          )
        ) {
          let rentalPriceLowerBound;
          let rentalPriceUpperBound;

          if ( filtersToApply.rentalPrice.lowerBound > filtersToApply.rentalPrice.upperBound ) {
            rentalPriceLowerBound = filtersToApply.rentalPrice.upperBound;
            rentalPriceUpperBound = filtersToApply.rentalPrice.lowerBound;
          } else {
            rentalPriceLowerBound = filtersToApply.rentalPrice.lowerBound;
            rentalPriceUpperBound = filtersToApply.rentalPrice.upperBound;
          }

          unitMatchesRentalPrice = (
            ( unit.price >= rentalPriceLowerBound )
            && (
              ( unit.price <= rentalPriceUpperBound )
              // If the current upper bound is equal to the default upper bound
              // (which means it is all the way to the right on the slider),
              // change from “$XXX” to “$XXX+”—i.e. expand the scope of prices to include
              // values above the nominal maximum.
              || (
                ( rentalPriceUpperBound === defaultFilters.rentalPrice.upperBound )
                && ( unit.price >= rentalPriceUpperBound )
              )
            )
          );
        } else {
          unitMatchesRentalPrice = true;
        }

        let unitMatchesBedrooms = (
          (
            filtersToApply.bedrooms['0']
            && ( unit.bedrooms === 0 )
          )
          || (
            filtersToApply.bedrooms['1']
            && ( unit.bedrooms === 1 )
          )
          || (
            filtersToApply.bedrooms['2']
            && ( unit.bedrooms === 2 )
          )
          || (
            filtersToApply.bedrooms['3+']
            && ( unit.bedrooms >= 3 )
          )
        );

        if ( matchOnNoneSelected ) {
          if (
            !filtersToApply.bedrooms['0']
            && !filtersToApply.bedrooms['1']
            && !filtersToApply.bedrooms['2']
            && !filtersToApply.bedrooms['3+']
          ) {
            unitMatchesBedrooms = true;
          }
        }

        // TODO: Maybe exit early if we already know it is not a match?
        // if ( !unitMatchesBedrooms ) {
        //   return false;
        // }

        let unitMatchesAmiQualification;
        const unitAmiQualification = ( unit.amiQualification || null );

        if ( unitAmiQualification === null ) {
          unitMatchesAmiQualification = true;
        } else if ( filtersToApply.amiQualification.lowerBound <= filtersToApply.amiQualification.upperBound ) {
          unitMatchesAmiQualification = (
            ( unitAmiQualification >= filtersToApply.amiQualification.lowerBound )
            && ( unitAmiQualification <= filtersToApply.amiQualification.upperBound )
          );
        // These values can be switched in the UI causing the names to no longer be semantic
        } else if ( filtersToApply.amiQualification.lowerBound > filtersToApply.amiQualification.upperBound ) {
          unitMatchesAmiQualification = (
            ( unitAmiQualification >= filtersToApply.amiQualification.upperBound )
            && ( unitAmiQualification <= filtersToApply.amiQualification.lowerBound )
          );
        }

        let unitMatchesIncomeQualification;
        const unitIncomeQualification = ( unit.incomeQualification || null );

        if ( ( unitIncomeQualification === null ) || !filtersToApply.incomeQualification.upperBound ) {
          unitMatchesIncomeQualification = true;
        } else {
          unitMatchesIncomeQualification = ( unitIncomeQualification <= filtersToApply.incomeQualification.upperBound );
        }

        return ( unitMatchesRentalPrice && unitMatchesBedrooms && unitMatchesAmiQualification && unitMatchesIncomeQualification );
      } );

      return {
        ...home,
        "units": newUnits,
      };
    } )
    .filter( ( home ) => !!home.units.length );

  return matchingHomes;
}

function getNewFilters( event, filters ) {
  const $input = event.target;
  let newValue;
  const newFilters = { ...filters };
  let valueAsKey = false;
  let isNumeric = false;
  let specialCase = false;
  let parent;
  let parentCriterion;

  switch ( $input.type ) {
    case 'checkbox':
      newValue = $input.checked;
      valueAsKey = true;
      break;

    default:
      newValue = $input.value;
  }

  if ( hasOwnProperty( event, 'metrolist' ) ) {
    if ( hasOwnProperty( event.metrolist, 'parentCriterion' ) ) {
      parentCriterion = event.metrolist.parentCriterion;

      switch ( parentCriterion ) { // eslint-disable-line default-case
        case 'amiQualification':
        case 'rentalPrice':
          isNumeric = true;
          break;
      }

      if ( isNumeric ) {
        newValue = Number.parseInt( newValue, 10 );
      }

      if ( parentCriterion !== $input.name ) {
        if ( valueAsKey ) {
          specialCase = true;
          parent = newFilters[parentCriterion][$input.name];
          parent[$input.value] = newValue;
        } else {
          specialCase = true;
          parent = newFilters[parentCriterion];
          parent[$input.name] = newValue;
        }
      }
    }
  }

  if ( !specialCase ) {
    // console.log( '!specialCase' );
    parent = newFilters[$input.name];
    parent[$input.value] = newValue;
  }

  switch ( $input.name ) {
    case 'neighborhood':
      if ( newValue && !filters.location.city.boston ) {
        newFilters.location.city.boston = newValue;
      }
      break;

    case 'cardinalDirection':
      if ( newValue && !filters.location.city.beyondBoston ) {
        newFilters.location.city.beyondBoston = newValue;
      }
      break;

    default:
  }

  // Selecting Boston or Beyond Boston checks/unchecks all subcategories
  switch ( $input.value ) {
    case 'boston':
      Object.keys( filters.location.neighborhood ).forEach( ( neighborhood ) => {
        newFilters.location.neighborhood[neighborhood] = newValue;
      } );
      break;

    case 'beyondBoston':
      Object.keys( filters.location.cardinalDirection ).forEach( ( cardinalDirection ) => {
        newFilters.location.cardinalDirection[cardinalDirection] = newValue;
      } );
      break;

      // case ''

    default:
  }

  return newFilters;
}

function Search( props ) {
  const [filters, setFilters] = useState( props.filters );
  const [paginatedHomes, setPaginatedHomes] = useState( paginate( Object.freeze( props.homes ) ) );
  const [filteredHomes, setFilteredHomes] = useState( Object.freeze( props.homes ) );
  const [currentPage, setCurrentPage] = useState( 1 );
  const [totalPages, setTotalPages] = useState( 1 );
  const [pages, setPages] = useState( [1] );
  const [isDesktop, setIsDesktop] = useState( window.matchMedia( '(min-width: 992px)' ).matches );
  const [showClearFiltersInitially, setShowClearFiltersInitially] = useState( false );
  const history = useHistory();
  const query = useQuery();
  const $drawer = useRef();
  let [updatingDrawerHeight, setUpdatingDrawerHeight] = useState( false ); // eslint-disable-line
  const isBeingTranslated = isOnGoogleTranslate();
  const baseUrl = ( isBeingTranslated ? getUrlBeingTranslated().replace( /\/metrolist\/.*/, '' ) : globalThis.location.origin );
  const relativeAmiEstimatorUrl = '/metrolist/ami-estimator';
  const absoluteAmiEstimatorUrl = `${baseUrl}${relativeAmiEstimatorUrl}`;
  const amiEstimatorUrl = ( isBeingTranslated ? copyGoogleTranslateParametersToNewUrl( absoluteAmiEstimatorUrl ) : relativeAmiEstimatorUrl );
  let listingCounts = {
    "offer": {
      "rent": 0,
      "sale": 0,
    },
    "location": {
      "city": {
        "boston": 0,
        "beyondBoston": 0,
      },
      "neighborhood": {},
      "cardinalDirection": {
        "west": 0,
        "north": 0,
        "south": 0,
      },
    },
  };

  history.listen( ( newLocation ) => {
    const requestedPage = getPage( newLocation );

    if ( requestedPage ) {
      setCurrentPage( requestedPage );
    } else {
      setCurrentPage( 1 );
    }
  } );

  const clearFilters = () => {
    const resetNeighborhoods = {};

    Object.keys( filters.location.neighborhood )
      .sort()
      .forEach( ( nb ) => {
        resetNeighborhoods[nb] = false;
      } );

    // Unfortunately we have to do this manually rather than
    // doing `setFilters( defaultFilters )` because of a
    // “quantum entanglement” bug in React where `defaultFilters`
    // is modified along with `filters`, even if it was frozen beforehand.
    const resetFilters = {
      "offer": {
        "rent": false,
        "sale": false,
      },
      "location": {
        "city": {
          "boston": false,
          "beyondBoston": false,
        },
        "neighborhood": {
          ...resetNeighborhoods,
        },
        "cardinalDirection": {
          "west": false,
          "north": false,
          "south": false,
        },
      },
      "bedrooms": {
        "0": false,
        "1": false,
        "2": false,
        "3+": false,
      },
      "amiQualification": {
        "lowerBound": 0,
        "upperBound": 200,
      },
      "incomeQualification": {
        "upperBound": null,
      },
      "rentalPrice": {
        "lowerBound": 0,
        "upperBound": 3000,
      },
    };

    // Save current filter state for undo functionality
    localStorage.setItem(
      'filters--undo',
      localStorage.getItem( 'filters' ),
    );
    localStorage.setItem(
      'useHouseholdIncomeAsIncomeQualificationFilter--undo',
      localStorage.getItem( 'useHouseholdIncomeAsIncomeQualificationFilter' ),
    );

    // console.log( 'resetFilters', resetFilters );
    setFilters( resetFilters );
    localStorage.setItem( 'useHouseholdIncomeAsIncomeQualificationFilter', 'false' );
  };

  const undoClearFilters = () => {
    const filtersToRestore = JSON.parse( localStorage.getItem( 'filters--undo' ) );

    setFilters( filtersToRestore );

    localStorage.setItem(
      'useHouseholdIncomeAsIncomeQualificationFilter',
      localStorage.getItem( 'useHouseholdIncomeAsIncomeQualificationFilter--undo' ),
    );

    localStorage.removeItem( 'filters--undo' );
    localStorage.removeItem( 'useHouseholdIncomeAsIncomeQualificationFilter--undo' );
  };

  const clearListingCounts = () => {
    listingCounts = {
      "offer": {
        "rent": 0,
        "sale": 0,
      },
      "location": {
        "city": {
          "boston": 0,
          "beyondBoston": 0,
        },
        "neighborhood": {},
        "cardinalDirection": {
          "west": 0,
          "north": 0,
          "south": 0,
        },
      },
      "rentalPrice": {
        "lowerBound": 0,
        "upperBound": 0,
      },
    };
  };

  const populateListingCounts = ( homes ) => {
    clearListingCounts();

    homes.forEach( ( home ) => {
      if ( home.offer === 'sale' ) {
        listingCounts.offer.sale++;
      } else if ( home.offer === 'rent' ) {
        listingCounts.offer.rent++;
      }

      if ( home.city ) {
        if ( home.city.toLowerCase() === 'boston' ) {
          listingCounts.location.city.boston++;
        } else {
          listingCounts.location.city.beyondBoston++;
        }
      }

      if ( home.neighborhood ) {
        // const neighborhoodKey = camelCase( home.neighborhood );
        const neighborhoodKey = home.neighborhood;

        if ( hasOwnProperty( listingCounts.location.neighborhood, neighborhoodKey ) ) {
          listingCounts.location.neighborhood[neighborhoodKey]++;
        } else {
          listingCounts.location.neighborhood[neighborhoodKey] = 1;
        }
      } else if ( home.cardinalDirection ) {
        listingCounts.location.cardinalDirection[home.cardinalDirection]++;
      }

      // if ( Array.isArray( home.units ) ) {
      //   home.units.forEach( ( unit ) => {
      //     if ( home.offer === 'rent' ) {
      //       // Not extracting lowest rent since we can just default to $0 and let the user adjust

      //       if ( unit.price > listingCounts.rentalPrice.upperBound ) {
      //         listingCounts.rentalPrice.upperBound = unit.price;
      //       }
      //     }
      //   } );
      // }
    } );
  };

  const getAllHomes = () => {
    if ( paginatedHomes.length ) {
      return paginatedHomes.reduce( ( pageA, pageB ) => pageA.concat( pageB ) );
    }

    return [];
  };

  useEffect( () => {
    if ( !getAllHomes().length ) {
      fetch(
        apiEndpoint,
        {
          "mode": "cors",
          "headers": {
            "Content-Type": "application/json",
          },
        },
      ) // TODO: CORS
        .then( async ( response ) => {
          if ( !response.body && !response._bodyInit ) {
            throw new Error( `Metrolist Developments API returned an invalid response.` );
          } else {
            return response.json();
          }
        } )
        .then( ( apiHomes ) => {
          const paginatedApiHomes = paginate( apiHomes );
          populateListingCounts( apiHomes );
          const existingFilters = localStorage.getItem( 'filters' );
          const requestedPage = parseInt( query.get( 'page' ), 10 );
          let newFilters;

          setPaginatedHomes( paginatedApiHomes );

          if ( requestedPage ) {
            setCurrentPage( requestedPage );
          } else {
            setCurrentPage( 1 );
          }

          setTotalPages( paginatedApiHomes.length );

          if ( existingFilters ) {
            newFilters = { ...JSON.parse( existingFilters ) };
          } else {
            newFilters = { ...filters };
          }

          Object.keys( listingCounts.location.neighborhood )
            .sort()
            .forEach( ( nb ) => {
              newFilters.location.neighborhood[nb] = ( newFilters.location.neighborhood[nb] || false );
              defaultFilters.location.neighborhood[nb] = false;
            } );

          Object.keys( listingCounts.location.cardinalDirection ).forEach( ( cd ) => {
            newFilters.location.cardinalDirection[cd] = ( newFilters.location.cardinalDirection[cd] || false );
            defaultFilters.location.cardinalDirection[cd] = false;
          } );

          setFilters( newFilters );
          localStorage.setItem( 'filters', JSON.stringify( newFilters ) );

          const defaultFiltersString = JSON.stringify( defaultFilters, null, 2 );
          const savedFiltersString = JSON.stringify( savedFilters, null, 2 );
          const savedFiltersMatchDefaultFilters = ( defaultFiltersString === savedFiltersString );

          console.log( 'defaultFilters', defaultFiltersString );
          console.log( '---' );
          console.log( 'savedFilters', savedFiltersString );
          console.log( 'savedFiltersMatchDefaultFilters', savedFiltersMatchDefaultFilters );

          setShowClearFiltersInitially( !savedFiltersMatchDefaultFilters );
        } )
        .catch( ( error ) => {
          console.error( error );
        } );
    }

    let isResizing = false;

    window.addEventListener( 'resize', ( /* event */ ) => {
      if ( !isResizing ) {
        isResizing = true;

        setTimeout( () => {
          setIsDesktop( window.matchMedia( '(min-width: 992px)' ).matches );
          isResizing = false;
        }, 125 );
      }
    } );
  }, [] );

  useEffect( () => {
    const allHomes = getAllHomes();

    if ( !allHomes.length ) {
      return;
    }

    const filteredAllHomes = filterHomes( allHomes, filters );
    const paginatedFilteredHomes = paginate( filteredAllHomes );
    const currentPageFilteredHomes = paginatedFilteredHomes[currentPage - 1];

    setFilteredHomes( currentPageFilteredHomes );
    setTotalPages( paginatedFilteredHomes.length );

    localStorage.setItem( 'filters', JSON.stringify( filters ) );
  }, [paginatedHomes, filters, currentPage] );

  useEffect( () => {
    setPages( Array.from( { "length": totalPages }, ( v, k ) => k + 1 ) );
  }, [totalPages] );

  const updateDrawerHeight = ( drawerRef, wait ) => {
    // console.log( 'updateDrawerHeight' );

    const updateHeight = () => {
      if ( drawerRef && drawerRef.current ) {
        const height = getComputedStyle( drawerRef.current ).getPropertyValue( 'height' );

        if ( height !== '0px' ) {
          drawerRef.current.style.height = height;
        }
      }

      setUpdatingDrawerHeight( false );
    };

    if ( wait ) {
      setTimeout( updateHeight, wait );
    } else {
      updateHeight();
    }
  };

  const supportsSvg = ( typeof SVGRect !== "undefined" );

  const FiltersPanelUi = () => {
    populateListingCounts( getAllHomes() );

    return (
      <FiltersPanel
        key="filters-panel"
        className="ml-search__filters"
        drawerRef={ $drawer }
        filters={ filters }
        clearFilters={ clearFilters }
        undoClearFilters={ undoClearFilters }
        showClearFiltersInitially={ showClearFiltersInitially }
        listingCounts={ listingCounts }
        updateDrawerHeight={ updateDrawerHeight }
        updatingDrawerHeight={ updatingDrawerHeight }
        setUpdatingDrawerHeight={ setUpdatingDrawerHeight }
        handleFilterChange={ ( event ) => {
          const newFilters = getNewFilters( event, filters );
          setFilters( newFilters );
          setCurrentPage( 1 );
          localStorage.setItem( 'filters', JSON.stringify( newFilters ) );
        } }
      />
    );
  };

  const CalloutUi = (
    <Inset key="ami-estimator-callout" className="filters-panel__callout-container" until="large">
      <Callout
        className={ `${supportsSvg ? 'ml-callout--icon-visible ' : ''}filters-panel__callout` }
        as="a"
        href={ amiEstimatorUrl }
        target={ isBeingTranslated ? '_blank' : undefined }
      >
        <Callout.Heading as="span">Use our AMI Estimator to find homes that match your income</Callout.Heading>
        <Callout.Icon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            className="ml-icon ml-icon--rightward-arrowhead"
            viewBox="0 0 10.842 18.615"
            width="11"
            height="19"
          >
            <title>&gt;</title>
            <path
              d="m0.93711 17.907c2.83-2.8267 5.66-5.6533 8.49-8.48-2.9067-2.9067-5.8133-5.8133-8.72-8.72"
              fill="none"
              stroke="currentColor"
              strokeMiterlimit="10"
              strokeWidth="2"
            ></path>
          </svg>
        </Callout.Icon>
      </Callout>
    </Inset>
  );
  const SidebarUi = [FiltersPanelUi(), CalloutUi];

  return (
    <article className={ `ml-search${props.className ? ` ${props.className}` : ''}` }>
      <h2 className="sr-only">Search</h2>
      <SearchPreferences filters={ filters } setFilters={ setFilters } />
      <Row space="panel" stackUntil="large">
        <Stack data-column-width="1/3" space="panel">
          { isDesktop ? SidebarUi.reverse() : SidebarUi }
        </Stack>
        <ResultsPanel
          className="ml-search__results"
          columnWidth="2/3"
          filters={ filters }
          homes={ filteredHomes }
        />
      </Row>
      <nav>
        <h3 className="sr-only">Pages</h3>
        <SearchPagination pages={ pages } currentPage={ currentPage } />
      </nav>
    </article>
  );
}

Search.propTypes = {
  "amiEstimation": PropTypes.number,
  "filters": filtersObject,
  "homes": PropTypes.arrayOf( homeObject ),
  "className": PropTypes.string,
};

Search.defaultProps = {
  "homes": [],
  "amiEstimation": null,
  "filters": {
    ...defaultFilters,
    ...savedFilters,
  },
};

localStorage.setItem( 'filters', JSON.stringify( Search.defaultProps.filters ) );

export default Search;
