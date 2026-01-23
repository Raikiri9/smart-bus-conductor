import calculateDistance from './distance';

export function checkTripRules(
  currentLat: number,
  currentLon: number,
  destinationLat: number,
  destinationLon: number,
  approachingNotified: boolean,
  overTravelNotified: boolean
) {
  const distance = calculateDistance(
    currentLat,
    currentLon,
    destinationLat,
    destinationLon
  );

  return {
    distance,
    shouldNotifyApproaching: distance <= 5 && !approachingNotified,
    shouldNotifyOverTravel: distance >= 20 && !overTravelNotified
  };
}

export default checkTripRules;
