import{W}from"./site-a9rzktkb.js";import{Z,q}from"./site-2yemvwby.js";var o="KHR_materials_dispersion";class nT{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return W.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function oT(){if(a)return;a=!0,q(o),Z(o,!0,(e)=>new nT(e))}oT();
export{nT,oT};

//# debugId=E883C75C191AF7DA64756E2164756E21
//# sourceMappingURL=site-x2xxt367.js.map
