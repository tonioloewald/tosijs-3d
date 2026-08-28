import{Pc as m}from"./site-6056gfrr.js";import{ie as n,je as a}from"./site-87nvg6e2.js";var r="KHR_materials_emissive_strength";class d{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return m.LoadExtensionAsync(e,t,this.name,async(i,_)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,_,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function l(){if(o)return;o=!0,a(r),n(r,!0,(e)=>new d(e))}l();
export{d as Va,l as Wa};

//# debugId=9E9A2902E4CF344A64756E2164756E21
//# sourceMappingURL=site-tay4qa3w.js.map
