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
  console.log('total distance start->dest =', total.toFixed(3));

  let cumulative = 0;
  for (let i = 0; i < simulatedRoute.length; i++) {
    if (i > 0) {
      const prev = simulatedRoute[i-1];
      const curr = simulatedRoute[i];
      const seg = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      cumulative += seg;
    }
    const remaining = calculateDistance(simulatedRoute[i].latitude, simulatedRoute[i].longitude, dest.latitude, dest.longitude);
    console.log('step', i, ': cumulativeTravelled=', cumulative.toFixed(3), 'km, remaining=', remaining.toFixed(3), 'km');
  }
})();