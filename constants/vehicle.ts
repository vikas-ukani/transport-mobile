// Vehicle RC number validation pattern for Indian vehicles
export const VEHICLE_RC_PATTERN_VALIDATION = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/i;

export const TRUCK_LOAD_CAPACITY_OPTIONS = Array.from(
  { length: 160 },
  (_, idx) => {
    const value = 0.5 + idx * 0.5;
    return {
      label: `${value} ton`,
      value: value.toString(),
    };
  }
);

export const TRUCK_HEIGHT_OPTIONS = Array.from({ length: 12 }, (_, idx) => {
  const value = 4 + idx; // 4 to 15 inclusive
  return {
    label: `${value} ft`,
    value: value.toString(),
  };
});

export const TRUCK_LENGTH_OPTIONS = Array.from({ length: 46 }, (_, idx) => {
  const value = 5 + idx; // 5 to 50 inclusive
  return {
    label: `${value} ft`,
    value: value.toString(),
  };
});
