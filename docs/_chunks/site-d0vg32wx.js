import{H}from"./site-ays616pe.js";import{K,Z}from"./site-ac958wa7.js";var r="KHR_materials_emissive_strength";class $y{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return H.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function jy(){if(o)return;o=!0,Z(r),K(r,!0,(e)=>new $y(e))}jy();
export{$y,jy};

//# debugId=3865B109A56D8B4D64756E2164756E21
//# sourceMappingURL=site-d0vg32wx.js.map
