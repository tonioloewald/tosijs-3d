import{ne as J}from"./site-0fbs8yt1.js";import{Ef as H,Ff as I}from"./site-em39wqsn.js";var k="MSFT_sRGBFactors";class K{constructor(f){this.name=k,this._loader=f,this.enabled=this._loader.isExtensionUsed(k)}dispose(){this._loader=null}loadMaterialPropertiesAsync(f,w,q){return J.LoadExtraAsync(f,w,this.name,async(V,P)=>{if(P){let h=this._loader._getOrCreateMaterialAdapter(q),Q=this._loader.loadMaterialPropertiesAsync(f,w,q),z=q.getScene().getEngine().useExactSrgbConversions;if(!h.baseColorTexture)h.baseColor.toLinearSpaceToRef(h.baseColor,z);if(!h.specularColorTexture)h.specularColor.toLinearSpaceToRef(h.specularColor,z);return await Q}})}}var D=!1;function O(){if(D)return;D=!0,I(k),H(k,!0,(f)=>new K(f))}O();
export{K as U,O as V};

//# debugId=BD8CAAFFBC54CD4A64756E2164756E21
//# sourceMappingURL=site-rryvvb21.js.map
