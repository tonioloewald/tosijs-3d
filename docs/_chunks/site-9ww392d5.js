import{H}from"./site-c7qw5g53.js";import{K,Z}from"./site-y5djcndq.js";var r="KHR_materials_emissive_strength";class A0{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return H.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function R0(){if(o)return;o=!0,Z(r),K(r,!0,(e)=>new A0(e))}R0();
export{A0,R0};

//# debugId=9A110A6A81CFAE6D64756E2164756E21
//# sourceMappingURL=site-9ww392d5.js.map
