import{U}from"./site-xv6m73df.js";import{j,Y}from"./site-jzy5dg86.js";var o="MSFT_sRGBFactors";class yS{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return U.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function TS(){if(i)return;i=!0,Y(o),j(o,!0,(e)=>new yS(e))}TS();
export{yS,TS};

//# debugId=207D8194792A395964756E2164756E21
//# sourceMappingURL=site-b0z9b1e2.js.map
