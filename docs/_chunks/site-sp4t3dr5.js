import{H}from"./site-10chp8j8.js";import{K,Z}from"./site-y5djcndq.js";var o="MSFT_sRGBFactors";class Zy{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return H.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function Ky(){if(i)return;i=!0,Z(o),K(o,!0,(e)=>new Zy(e))}Ky();
export{Zy,Ky};

//# debugId=C118C01FECE42CA764756E2164756E21
//# sourceMappingURL=site-sp4t3dr5.js.map
