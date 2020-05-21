import React, {
  useEffect, useRef, useState, forwardRef,
} from 'react';
import PropTypes from 'prop-types';

import Button from '@components/Button';
import Stack from '@components/Stack';
import { updatePageTitle } from '@util/a11y-seo';
import InputSummary from '../_AmiEstimatorInputSummary';

import './AmiEstimatorResult.scss';

// 100% AMI
const amiDefinition = {
  "people_1": 79350,
  "people_2": 90650,
  "people_3": 102000,
  "people_4": 113300,
  "people_5": 122400,
  "people_6": 131450,
};

function estimateAmi( { householdSize, householdIncome, incomeRate } ) {
  householdSize = householdSize.value.replace( '+', '' );
  householdIncome = householdIncome.value;
  incomeRate = incomeRate.value;

  const parsedHouseholdIncome = parseFloat( householdIncome.replace( /[$,]/g, '' ) );
  const maxIncome = amiDefinition[`people_${householdSize}`];
  let annualizedHouseholdIncome = parsedHouseholdIncome;
  let estimation;

  if ( incomeRate === 'Monthly' ) {
    annualizedHouseholdIncome *= 12;
  }

  if (
    Number.isNaN( annualizedHouseholdIncome )
    || Number.isNaN( maxIncome )
  ) {
    console.warn(
      `AMI calculation failed: one or both of \`annualizedHouseholdIncome\` and \`maxIncome\` resolved to non-numeric values.`
      + ` This could be due to \`props.formData\` being incomplete or missing.`,
    );
    estimation = 0;
  } else {
    estimation = Math.floor( ( annualizedHouseholdIncome / maxIncome ) * 100 );
  }

  return estimation;
}

function recommendAmi( amiEstimation ) {
  if ( amiEstimation < 0 ) {
    return 0;
  }

  if ( amiEstimation ) {
    return ( Math.ceil( amiEstimation / 5 ) * 5 );
  }

  return amiEstimation;
}

function isAboveUpperBound( amiEstimation ) {
  return ( amiEstimation > 200 );
}

const AmiEstimatorResult = forwardRef( ( props, ref ) => {
  const selfRef = ( ref || useRef() );
  const [amiEstimation] = useState( estimateAmi( props.formData ) );
  let amiRecommendation = recommendAmi( amiEstimation );
  localStorage.setItem( 'amiRecommendation', amiRecommendation );

  useEffect( () => {
    updatePageTitle( 'Result', 'AMI Estimator' );
    props.setStep( props.step );
    props.adjustContainerHeight( selfRef );
  }, [] );

  useEffect( () => {
    amiRecommendation = recommendAmi( amiEstimation );
    localStorage.setItem( 'amiRecommendation', amiRecommendation );
  }, [amiEstimation] );

  return (
    <div ref={ selfRef } className={ `ml-ami-estimator__result ml-ami-estimator__prompt${props.className ? ` ${props.className}` : ''}` } data-testid="ml-ami-estimator__result">
      <Stack space="2" className="ml-ami-estimator__prompt-inner">
        <InputSummary formData={ props.formData } />
        <Stack space="1">
          <p>Estimated Eligibility: <dfn className="ml-ami">{ amiEstimation }% AMI</dfn> (Area Median Income)</p>
          { isAboveUpperBound( amiEstimation ) && <p>Given your income level, you are unlikely to qualify for units marketed on Metrolist.</p> }
          { !isAboveUpperBound( amiEstimation ) && <p>We recommend searching for homes listed at <b className="ml-ami">{ amiRecommendation }% AMI</b> and above.</p> }
        </Stack>
        <Stack as="nav" space="1">
          <Button as="a" variant="primary" href="/metrolist/search">See homes that match this eligibility range</Button>
        </Stack>
      </Stack>
    </div>
  );
} );

AmiEstimatorResult.displayName = 'Result';

AmiEstimatorResult.propTypes = {
  "children": PropTypes.node,
  "className": PropTypes.string,
  "step": PropTypes.number,
  "setStep": PropTypes.func,
  "formData": PropTypes.object,
  "fakeFormData": PropTypes.object,
  "adjustContainerHeight": PropTypes.func,
};

AmiEstimatorResult.defaultProps = {
  "fakeFormData": {
    "householdSize": {
      "value": "4",
    },
    "householdIncome": {
      "value": "$5,000.00",
    },
    "incomeRate": {
      "value": "Monthly",
    },
  },
};

export default AmiEstimatorResult;
