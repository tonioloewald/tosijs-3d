import{H}from"./site-48801y64.js";import{J,K}from"./site-5d3gdg3n.js";var r="KHR_materials_emissive_strength";class eT{constructor(e){this.name=r,this.order=170,this._loader=e,this.enabled=this._loader.isExtensionUsed(r)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,t,s){return H.LoadExtensionAsync(e,t,this.name,async(i,n)=>(await this._loader.loadMaterialPropertiesAsync(e,t,s),this._loadEmissiveProperties(i,n,s),await Promise.resolve()))}_loadEmissiveProperties(e,t,s){if(t.emissiveStrength!==void 0){let i=this._loader._getOrCreateMaterialAdapter(s);i.emissionLuminance=t.emissiveStrength}}}var o=!1;function tT(){if(o)return;o=!0,K(r),J(r,!0,(e)=>new eT(e))}tT();
export{eT,tT};

//# debugId=256E1FAB80D8397064756E2164756E21
//# sourceMappingURL=site-s662r46k.js.map
