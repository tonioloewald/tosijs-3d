import{ne as J}from"./site-ycdhzx7n.js";import{Ef as D,Ff as I}from"./site-hzjsqcbq.js";var w="KHR_materials_dispersion";class O{constructor(f){this.name=w,this.order=174,this._loader=f,this.enabled=this._loader.isExtensionUsed(w)}dispose(){this._loader=null}loadMaterialPropertiesAsync(f,k,q){return J.LoadExtensionAsync(f,k,this.name,async(v,h)=>{let z=[];return z.push(this._loader.loadMaterialPropertiesAsync(f,k,q)),z.push(this._loadDispersionPropertiesAsync(v,k,q,h)),await Promise.all(z).then(()=>{})})}_loadDispersionPropertiesAsync(f,k,q,v){let h=this._loader._getOrCreateMaterialAdapter(q);if(h.transmissionWeight==0||!v.dispersion)return Promise.resolve();return h.transmissionDispersionAbbeNumber=20,h.transmissionDispersionScale=v.dispersion,Promise.resolve()}}var B=!1;function P(){if(B)return;B=!0,I(w),D(w,!0,(f)=>new O(f))}P();
export{O as sb,P as tb};

//# debugId=0E22A2489D85836764756E2164756E21
//# sourceMappingURL=site-5w54f92g.js.map
