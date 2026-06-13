import React from 'react';
import { TripLocation } from '../types/places';
import { LocationSearchField } from './LocationSearchField';

interface DestinationSearchFieldProps {
  value: TripLocation | null;
  onChange: (destination: TripLocation | null) => void;
  error?: string;
}

export function DestinationSearchField({
  value,
  onChange,
  error,
}: DestinationSearchFieldProps) {
  return (
    <LocationSearchField
      label="Destination"
      value={value}
      onChange={onChange}
      scope="region"
      placeholder="Search country, city, or region"
      allowManual
      error={error}
    />
  );
}
