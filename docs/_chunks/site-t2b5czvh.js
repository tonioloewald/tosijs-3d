import{H}from"./site-qwzjxgka.js";import{q,Q}from"./site-538xen72.js";var o="KHR_materials_dispersion";class Q0{constructor(e){this.name=o,this.order=174,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,i){return H.LoadExtensionAsync(e,s,this.name,async(t,r)=>{let n=[];return n.push(this._loader.loadMaterialPropertiesAsync(e,s,i)),n.push(this._loadDispersionPropertiesAsync(t,s,i,r)),await Promise.all(n).then(()=>{})})}_loadDispersionPropertiesAsync(e,s,i,t){let r=this._loader._getOrCreateMaterialAdapter(i);if(r.transmissionWeight==0||!t.dispersion)return Promise.resolve();return r.transmissionDispersionAbbeNumber=20,r.transmissionDispersionScale=t.dispersion,Promise.resolve()}}var a=!1;function q0(){if(a)return;a=!0,Q(o),q(o,!0,(e)=>new Q0(e))}q0();
export{Q0,q0};

//# debugId=146D2216C9384BC664756E2164756E21
//# sourceMappingURL=site-t2b5czvh.js.map
