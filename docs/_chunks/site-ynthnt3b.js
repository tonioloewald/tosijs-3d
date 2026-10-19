import{H}from"./site-kmyw9n0q.js";import{K,Z}from"./site-y5djcndq.js";var r="KHR_materials_emissive_strength";class Ay{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return H.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function Ry(){if(o)return;o=!0,Z(r),K(r,!0,(e)=>new Ay(e))}Ry();
export{Ay,Ry};

//# debugId=CAEC0C8B6454DD5464756E2164756E21
//# sourceMappingURL=site-ynthnt3b.js.map
