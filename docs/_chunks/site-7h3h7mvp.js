import{ne as l}from"./site-v8h137ww.js";import{Ef as n,Ff as c}from"./site-2py380ff.js";var o="MSFT_sRGBFactors";class p{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return l.LoadExtraAsync(e,s,this.name,async(f,d)=>{if(d){let r=this._loader._getOrCreateMaterialAdapter(t),x=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await x}})}}var i=!1;function u(){if(i)return;i=!0,c(o),n(o,!0,(e)=>new p(e))}u();
export{p as U,u as V};

//# debugId=4D007216BFD7006164756E2164756E21
//# sourceMappingURL=site-7h3h7mvp.js.map
