import{W}from"./site-5m4gr3v1.js";import{Z,q}from"./site-2yemvwby.js";var o="MSFT_sRGBFactors";class ty{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return W.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function iy(){if(i)return;i=!0,q(o),Z(o,!0,(e)=>new ty(e))}iy();
export{ty,iy};

//# debugId=B6D19525DED428EA64756E2164756E21
//# sourceMappingURL=site-9xbfyr6v.js.map
