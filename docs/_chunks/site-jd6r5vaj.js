import{H}from"./site-tceyfdvy.js";import{K,Z}from"./site-jfk529r4.js";var o="KHR_materials_dispersion";class Zy{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return H.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function Ky(){if(a)return;a=!0,Z(o),K(o,!0,(e)=>new Zy(e))}Ky();
export{Zy,Ky};

//# debugId=5D015D0A972C501564756E2164756E21
//# sourceMappingURL=site-jd6r5vaj.js.map
