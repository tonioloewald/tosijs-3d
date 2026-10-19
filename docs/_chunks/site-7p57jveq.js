import{H}from"./site-c7qw5g53.js";import{K,Z}from"./site-y5djcndq.js";var o="KHR_materials_dispersion";class tT{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return H.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function iT(){if(a)return;a=!0,Z(o),K(o,!0,(e)=>new tT(e))}iT();
export{tT,iT};

//# debugId=5A9313A193D33AFD64756E2164756E21
//# sourceMappingURL=site-7p57jveq.js.map
