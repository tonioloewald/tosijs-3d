import{W}from"./site-7t46yw6q.js";import{q,Q}from"./site-1fsbjacg.js";var o="KHR_materials_dispersion";class nT{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return W.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function oT(){if(a)return;a=!0,Q(o),q(o,!0,(e)=>new nT(e))}oT();
export{nT,oT};

//# debugId=34B1B6DB924EF9A964756E2164756E21
//# sourceMappingURL=site-xqypdbxy.js.map
