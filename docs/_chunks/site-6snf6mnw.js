import{H}from"./site-dk4rde76.js";import{K,Z}from"./site-r7783215.js";var o="MSFT_sRGBFactors";class by{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return H.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function vy(){if(i)return;i=!0,Z(o),K(o,!0,(e)=>new by(e))}vy();
export{by,vy};

//# debugId=8720C58E2033479964756E2164756E21
//# sourceMappingURL=site-6snf6mnw.js.map
