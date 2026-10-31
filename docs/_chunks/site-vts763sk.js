import{H}from"./site-k43e79zf.js";import{K,Z}from"./site-7tkgwrht.js";var o="KHR_materials_dispersion";class gT{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return H.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function _T(){if(a)return;a=!0,Z(o),K(o,!0,(e)=>new gT(e))}_T();
export{gT,_T};

//# debugId=EC6AAC9A851197F964756E2164756E21
//# sourceMappingURL=site-vts763sk.js.map
