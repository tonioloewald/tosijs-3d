import{H}from"./site-k43e79zf.js";import{K,Z}from"./site-7tkgwrht.js";var r="KHR_materials_emissive_strength";class Gy{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return H.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function Uy(){if(o)return;o=!0,Z(r),K(r,!0,(e)=>new Gy(e))}Uy();
export{Gy,Uy};

//# debugId=9E65D080BBE6D86064756E2164756E21
//# sourceMappingURL=site-bm0q0g0n.js.map
