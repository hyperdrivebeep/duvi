/** Find the unique keyboard anchor, then record one complete forward cycle. */
export async function measureTabCycle({tab,focus,anchor,limit=500}){
  async function untilAnchor(capture,start){
    const trail=[];
    if(capture)trail.push(start);
    for(let i=0;i<limit;i++){
      await tab();
      const stop=await focus();
      if(anchor(stop))return {trail,stop};
      if(capture)trail.push(stop);
    }
    throw new Error('Tab cycle did not reach its starting landmark');
  }
  const first=await focus();
  const starting=anchor(first)?first:(await untilAnchor(false)).stop;
  return (await untilAnchor(true,starting)).trail;
}
