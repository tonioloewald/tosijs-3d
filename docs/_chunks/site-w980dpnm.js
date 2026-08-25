import{Aw as i}from"./site-fy200dkd.js";class s{constructor(){this._gpuTimeInFrameId=-1,this.counter=new i}_addDuration(e,t){if(e<this._gpuTimeInFrameId)return;if(this._gpuTimeInFrameId!==e)this.counter._fetchResult(),this.counter.fetchNewFrame(),this.counter.addCount(t,!1),this._gpuTimeInFrameId=e;else this.counter.addCount(t,!1)}}
export{s as yw};

//# debugId=E31D9DD3F5E68E2064756E2164756E21
//# sourceMappingURL=site-w980dpnm.js.map
