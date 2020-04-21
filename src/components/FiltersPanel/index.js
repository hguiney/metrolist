import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import FilterGroup from '@components/FilterGroup';
import Filter from '@components/Filter';
// import Callout from '@components/Callout';
import Icon from '@components/Icon';
import Stack from '@components/Stack';
// import Inset from '@components/Inset';
import Row from '@components/Row';
import Column from '@components/Column';

import './FiltersPanel.scss';

function FiltersPanel( props ) {
  const isDesktop = window.matchMedia( '(min-width: 992px)' ).matches; // TODO: define breakpoints that line up with the CSS in JS somewhere
  const $drawer = useRef();
  const attributes = { ...props };
  const [isExpanded, setExpanded] = useState( isDesktop );

  const updateDrawerHeight = ( wait ) => {
    const updateHeight = () => {
      const height = getComputedStyle( $drawer.current ).getPropertyValue( 'height' );

      if ( height !== '0px' ) {
        $drawer.current.style.height = height;
      }
    };

    if ( wait ) {
      setTimeout( updateHeight, wait );
    } else {
      updateHeight();
    }
  };

  const handleDoubleClick = ( event ) => {
    // https://stackoverflow.com/a/43321596/214325
    if ( event.detail > 1 ) { // Number of clicks
      event.preventDefault();
    }
  };

  const handleClick = ( event ) => {
    const $element = event.target;
    let { className, nodeName } = $element;

    nodeName = nodeName.toLowerCase();

    if ( nodeName === 'use' ) {
      className = $element.parentNode.className;
    }

    if ( className instanceof SVGAnimatedString ) {
      className = className.baseVal;
    }

    const isFiltersPanelClick = /\bml-filters-panel/.test( className );

    if ( isFiltersPanelClick ) {
      setExpanded( !isExpanded );
    } else {
      $drawer.current.style.height = '';
      updateDrawerHeight( 250 );
    }
  };


  useEffect( updateDrawerHeight );

  if ( props.className ) {
    delete attributes.className;
  }

  if ( props.columnWidth ) {
    delete attributes.columnWidth;
    attributes['data-column-width'] = props.columnWidth;
  }

  return (
    <section
      className={
        `ml-filters-panel${
          props.className
            ? ` ${props.className}`
            : ''
        }${
          isExpanded ? ' ml-filters-panel--expanded' : ''
        }`
      }
      { ...attributes }
      onClick={ handleClick }
    >
      <div className="ml-filters-panel__menu">
        <h3
          className="ml-filters-panel__heading"
          aria-expanded={ isExpanded.toString() }
          aria-controls="filters-panel-content"
          onMouseDown={ handleDoubleClick }
        >
          Filter Listings
          <Icon className="ml-filters-panel__heading-icon" use="#icon-details-marker" />
        </h3>
        <div
          id="filters-panel-content"
          ref={ $drawer }
          className={ `ml-filters-panel__content${isExpanded ? ' ml-filters-panel__content--expanded' : ''}` }
        >
          <FilterGroup>
            <FilterGroup.Label>Offer</FilterGroup.Label>
            <Row space="rent-sale" stackAt="large">
              <Column width="1/2">
                <Filter type="checkbox-button" criterion="offer" value="rental">For Rent</Filter>
              </Column>
              <Column width="1/2">
                <Filter type="checkbox-button" criterion="offer" value="sale">For Sale</Filter>
              </Column>
            </Row>
          </FilterGroup>
          <FilterGroup>
            <FilterGroup.Label>Location</FilterGroup.Label>
            <Stack space="sister-checkboxes">
              <Filter type="checkbox" criterion="city" value="Boston">
                <Filter.Label>Boston</Filter.Label>
                <Filter type="checkbox" criterion="neighborhood" value="south-boston">South Boston</Filter>
                <Filter type="checkbox" criterion="neighborhood" value="hyde-park">Hyde Park</Filter>
                <Filter type="checkbox" criterion="neighborhood" value="dorchester">Dorchester</Filter>
                <Filter type="checkbox" criterion="neighborhood" value="mattapan">Mattapan</Filter>
              </Filter>
              <Filter type="checkbox" criterion="city" value="!Boston">
                <Filter.Label>Beyond Boston</Filter.Label>
                <Filter type="checkbox">West of Boston</Filter>
                <Filter type="checkbox">North of Boston</Filter>
                <Filter type="checkbox">South of Boston</Filter>
              </Filter>
            </Stack>
          </FilterGroup>
          <FilterGroup>
            <FilterGroup.Label>Bedrooms</FilterGroup.Label>
            <Filter>
              <Filter type="checkbox">1</Filter>
              <Filter type="checkbox">2</Filter>
              <Filter type="checkbox">3</Filter>
              <Filter type="checkbox">4+</Filter>
            </Filter>
          </FilterGroup>
          <FilterGroup>
            <FilterGroup.Label>Income Eligibility (AMI%)</FilterGroup.Label>
            <Filter>
              <Filter type="checkbox">40%</Filter>
              <Filter type="checkbox">50%</Filter>
              <Filter type="checkbox">60%</Filter>
              <Filter type="checkbox">70%</Filter>
              <Filter type="checkbox">80%</Filter>
              <Filter type="checkbox">90%</Filter>
              <Filter type="checkbox">100%</Filter>
              <Filter type="checkbox">110%</Filter>
              <Filter type="checkbox">120%</Filter>
            </Filter>
          </FilterGroup>
        </div>
      </div>{/* filters-panel__menu */}
    </section>
  );
}

FiltersPanel.propTypes = {
  "className": PropTypes.string,
  "columnWidth": PropTypes.string,
};

export default FiltersPanel;
