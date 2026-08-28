import{Pc as l}from"./site-6056gfrr.js";import{ie as p,je as d}from"./site-87nvg6e2.js";var o="KHR_materials_dispersion";class m{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return l.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function _(){if(a)return;a=!0,d(o),p(o,!0,(e)=>new m(e))}_();
export{m as Ta,_ as Ua};

//# debugId=144DD3334754FADB64756E2164756E21
//# sourceMappingURL=site-2sfy4t30.js.map
