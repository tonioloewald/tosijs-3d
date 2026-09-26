import{H}from"./site-qwzjxgka.js";import{q,Q}from"./site-538xen72.js";var o="MSFT_sRGBFactors";class Yy{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return H.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function $y(){if(i)return;i=!0,Q(o),q(o,!0,(e)=>new Yy(e))}$y();
export{Yy,$y};

//# debugId=AB84C6F9125DF27064756E2164756E21
//# sourceMappingURL=site-w09kwhpj.js.map
