import{H}from"./site-dk4rde76.js";import{K,Z}from"./site-r7783215.js";var r="KHR_materials_emissive_strength";class jy{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return H.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function Qy(){if(o)return;o=!0,Z(r),K(r,!0,(e)=>new jy(e))}Qy();
export{jy,Qy};

//# debugId=4F66E68B79B8C1F064756E2164756E21
//# sourceMappingURL=site-yxdcra5c.js.map
