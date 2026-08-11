import{ne as J}from"./site-0fbs8yt1.js";import{Ef as D,Ff as I}from"./site-em39wqsn.js";var w="KHR_materials_emissive_strength";class O{constructor(f){this.name=w,this.order=170,this._loader=f,this.enabled=this._loader.isExtensionUsed(w)}dispose(){this._loader=null}loadMaterialPropertiesAsync(f,k,q){return J.LoadExtensionAsync(f,k,this.name,async(z,Q)=>{return await this._loader.loadMaterialPropertiesAsync(f,k,q),this._loadEmissiveProperties(z,Q,q),await Promise.resolve()})}_loadEmissiveProperties(f,k,q){if(k.emissiveStrength!==void 0){let z=this._loader._getOrCreateMaterialAdapter(q);z.emissionLuminance=k.emissiveStrength}}}var B=!1;function P(){if(B)return;B=!0,I(w),D(w,!0,(f)=>new O(f))}P();
export{O as Ia,P as Ja};

//# debugId=DE24791E7BAB124064756E2164756E21
//# sourceMappingURL=site-v1fpww0r.js.map
