import{H}from"./site-esgkawtm.js";import{K,Z}from"./site-jfk529r4.js";var o="MSFT_sRGBFactors";class Cy{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return H.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function Ay(){if(i)return;i=!0,Z(o),K(o,!0,(e)=>new Cy(e))}Ay();
export{Cy,Ay};

//# debugId=4158E05526768C9764756E2164756E21
//# sourceMappingURL=site-xprr6kxq.js.map
