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
  console.log('Destination coords:', dest);

  for (let i = 0; i < simulatedRoute.length; i++) {
    const pt = simulatedRoute[i];
    const dist = calculateDistance(pt.latitude, pt.longitude, dest.latitude, dest.longitude);
    console.log(`step ${i}: point(${pt.latitude},${pt.longitude}) => remaining=${dist.toFixed(3)} km`);
    if (dist <= 5 && dist > 0) {
      console.log(`ALERT would trigger at step ${i} (remaining ${dist.toFixed(3)} km)`);
    }

    // check for interpolation between this point and the next
    if (i < simulatedRoute.length - 1) {
      const next = simulatedRoute[i+1];
      const nextDist = calculateDistance(next.latitude, next.longitude, dest.latitude, dest.longitude);
      if (dist > 5 && nextDist <= 5) {
        const denom = dist - nextDist;
        const fraction = denom > 0 ? Math.max(0, Math.min(1, (dist - 5) / denom)) : 0;
        const interpolatedIndex = i + fraction;
        console.log(`INTERPOLATION: crossing at index ~${interpolatedIndex.toFixed(3)} (fraction ${fraction.toFixed(3)}) — crossing remaining=5 km`);
      }
    }
  }
})();