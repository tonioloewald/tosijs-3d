import{H}from"./site-htw4djkb.js";import{K,Z}from"./site-y5djcndq.js";var r="KHR_materials_emissive_strength";class Ey{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return H.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function Ry(){if(o)return;o=!0,Z(r),K(r,!0,(e)=>new Ey(e))}Ry();
export{Ey,Ry};

//# debugId=4C861FD3F9ECE1D964756E2164756E21
//# sourceMappingURL=site-k88ry5q2.js.map
