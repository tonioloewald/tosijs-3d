import{ne as l}from"./site-v8h137ww.js";import{Ef as p,Ff as d}from"./site-2py380ff.js";var o="KHR_materials_dispersion";class m{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return l.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function _(){if(a)return;a=!0,d(o),p(o,!0,(e)=>new m(e))}_();
export{m as sb,_ as tb};

//# debugId=E3AC5708D0F8B68564756E2164756E21
//# sourceMappingURL=site-d7vhpsn4.js.map
