import{W}from"./site-bzp1m843.js";import{q,Q}from"./site-1fsbjacg.js";var r="KHR_materials_emissive_strength";class Oy{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return W.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function My(){if(o)return;o=!0,Q(r),q(r,!0,(e)=>new Oy(e))}My();
export{Oy,My};

//# debugId=5E61EE14E29BE6FA64756E2164756E21
//# sourceMappingURL=site-93xjbffm.js.map
