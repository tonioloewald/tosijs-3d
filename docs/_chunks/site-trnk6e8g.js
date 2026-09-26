import{H}from"./site-qwzjxgka.js";import{q,Q}from"./site-538xen72.js";var r="KHR_materials_emissive_strength";class Z0{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return H.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function K0(){if(o)return;o=!0,Q(r),q(r,!0,(e)=>new Z0(e))}K0();
export{Z0,K0};

//# debugId=F7EA279DD1F9987D64756E2164756E21
//# sourceMappingURL=site-trnk6e8g.js.map
