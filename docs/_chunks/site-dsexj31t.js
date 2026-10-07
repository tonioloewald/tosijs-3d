import{W}from"./site-s4xfk82r.js";import{q,Q}from"./site-1fsbjacg.js";var o="MSFT_sRGBFactors";class ty{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return W.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function iy(){if(i)return;i=!0,Q(o),q(o,!0,(e)=>new ty(e))}iy();
export{ty,iy};

//# debugId=1CD71A65EE84CA8064756E2164756E21
//# sourceMappingURL=site-dsexj31t.js.map
