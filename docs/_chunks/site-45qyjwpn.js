import{H}from"./site-48801y64.js";import{J,K}from"./site-5d3gdg3n.js";var o="KHR_materials_dispersion";class KS{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return H.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function JS(){if(a)return;a=!0,K(o),J(o,!0,(e)=>new KS(e))}JS();
export{KS,JS};

//# debugId=E478F4325531062C64756E2164756E21
//# sourceMappingURL=site-45qyjwpn.js.map
