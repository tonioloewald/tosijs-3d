import{Pc as l}from"./site-6056gfrr.js";import{ie as n,je as c}from"./site-87nvg6e2.js";var o="MSFT_sRGBFactors";class p{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return l.LoadExtraAsync(e,s,this.name,async(f,d)=>{if(d){let r=this._loader._getOrCreateMaterialAdapter(t),x=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await x}})}}var i=!1;function u(){if(i)return;i=!0,c(o),n(o,!0,(e)=>new p(e))}u();
export{p as qa,u as ra};

//# debugId=D42939DF69D2907E64756E2164756E21
//# sourceMappingURL=site-p49m4kmn.js.map
