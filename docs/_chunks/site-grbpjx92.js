import{ne as J}from"./site-ycdhzx7n.js";import{Ef as H,Ff as I}from"./site-hzjsqcbq.js";var k="MSFT_sRGBFactors";class K{constructor(f){this.name=k,this._loader=f,this.enabled=this._loader.isExtensionUsed(k)}dispose(){this._loader=null}loadMaterialPropertiesAsync(f,w,q){return J.LoadExtraAsync(f,w,this.name,async(V,P)=>{if(P){let h=this._loader._getOrCreateMaterialAdapter(q),Q=this._loader.loadMaterialPropertiesAsync(f,w,q),z=q.getScene().getEngine().useExactSrgbConversions;if(!h.baseColorTexture)h.baseColor.toLinearSpaceToRef(h.baseColor,z);if(!h.specularColorTexture)h.specularColor.toLinearSpaceToRef(h.specularColor,z);return await Q}})}}var D=!1;function O(){if(D)return;D=!0,I(k),H(k,!0,(f)=>new K(f))}O();
export{K as U,O as V};

//# debugId=1F2FC1C9DCB5DF6364756E2164756E21
//# sourceMappingURL=site-grbpjx92.js.map
