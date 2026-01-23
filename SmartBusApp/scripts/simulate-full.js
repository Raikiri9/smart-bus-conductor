(function(){
  function toRad(v){return (v*Math.PI)/180}
  function calculateDistance(lat1,lon1,lat2,lon2){
    const R=6371;
    const dLat=toRad(lat2-lat1);
    const dLon=toRad(lon2-lon1);
    const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  const simulatedRoute=[
    {latitude:-17.8252,longitude:31.0335},
    {latitude:-17.81,longitude:31.05},
    {latitude:-17.795,longitude:31.08},
    {latitude:-17.78,longitude:31.11},
    {latitude:-17.76,longitude:31.160}
  ];

  const dest = simulatedRoute[simulatedRoute.length - 1];
  const start = simulatedRoute[0];
  const total = calculateDistance(start.latitude,start.longitude,dest.latitude,dest.longitude);
  console.log('Total distance start->dest =', total.toFixed(3));

  // Simulate ticks where both route advances by 1 point per tick and tracker increments by +1 km per tick
  let routeIndex = 0;
  let trackerDistance = 0; // km
  let prevRemaining = Number.POSITIVE_INFINITY;
  let fiveKmAlertPlayed = false;

  const ticks = 10;
  for (let t = 0; t < ticks; t++) {
    console.log('\nTick', t, 'routeIndex', routeIndex, 'trackerDistance', trackerDistance.toFixed(3));

    const currentPoint = simulatedRoute[Math.min(routeIndex, simulatedRoute.length -1)];
    const remaining = calculateDistance(currentPoint.latitude, currentPoint.longitude, dest.latitude, dest.longitude);
    console.log('  route remaining =', remaining.toFixed(3));

    // crossing detection
    if (prevRemaining > 5 && remaining <= 5 && remaining > 0 && !fiveKmAlertPlayed) {
      // denom
      const prev = prevRemaining;
      const curr = remaining;
      const denom = prev - curr;
      const fraction = denom > 0 ? Math.max(0, Math.min(1, (prev - 5) / denom)) : 0;
      // cumulative prev (up to the previous point/segment)
      const prevIndex = Math.max(0, routeIndex - 1);
      let cumulativePrev = 0;
      for (let i = 1; i <= prevIndex; i++) {
        const p1 = simulatedRoute[i - 1];
        const p2 = simulatedRoute[i];
        cumulativePrev += calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
      }
      const prevPoint = simulatedRoute[prevIndex];
      const currPoint = simulatedRoute[Math.min(prevIndex+1, simulatedRoute.length-1)];
      const segmentLength = calculateDistance(prevPoint.latitude, prevPoint.longitude, currPoint.latitude, currPoint.longitude);
      const currentDistanceAtCrossing = cumulativePrev + fraction * segmentLength;

      console.log('  crossing fraction =', fraction.toFixed(3));
      console.log('  cumulativePrev =', cumulativePrev.toFixed(3), 'segmentLength=', segmentLength.toFixed(3));
      console.log('  currentDistanceAtCrossing =', currentDistanceAtCrossing.toFixed(3));
      console.log('  trackerDistance at this tick =', trackerDistance.toFixed(3));

      // If trackerDistance < currentDistanceAtCrossing then the alert will be fired now but trackerDistance represents less travelled km; we should sync tracker to crossing
      if (trackerDistance < currentDistanceAtCrossing) {
        console.log('  Syncing tracker from', trackerDistance.toFixed(3), 'to', currentDistanceAtCrossing.toFixed(3));
        trackerDistance = currentDistanceAtCrossing;
      }

      console.log('  ALERT would play now and trackerDistance would be', trackerDistance.toFixed(3));
      fiveKmAlertPlayed = true;
    }

    prevRemaining = remaining;

    // advance tracker by +1 km and route every tick
    trackerDistance += 1;
    routeIndex = Math.min(routeIndex + 1, simulatedRoute.length-1);
  }
})();