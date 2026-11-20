import{H}from"./site-48801y64.js";import{J,K}from"./site-5d3gdg3n.js";var o="MSFT_sRGBFactors";class AS{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return H.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function ES(){if(i)return;i=!0,K(o),J(o,!0,(e)=>new AS(e))}ES();
export{AS,ES};

//# debugId=18DCD0BEF6A90DEB64756E2164756E21
//# sourceMappingURL=site-jqspw7w0.js.map
