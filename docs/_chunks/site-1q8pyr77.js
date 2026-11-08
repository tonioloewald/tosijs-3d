import{H}from"./site-ays616pe.js";import{K,Z}from"./site-ac958wa7.js";var o="MSFT_sRGBFactors";class xy{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return H.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function by(){if(i)return;i=!0,Z(o),K(o,!0,(e)=>new xy(e))}by();
export{xy,by};

//# debugId=4CBC1906D9C6D4D364756E2164756E21
//# sourceMappingURL=site-1q8pyr77.js.map
