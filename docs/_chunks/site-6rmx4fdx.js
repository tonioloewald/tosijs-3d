import{H}from"./site-vac3fsxe.js";import{K,Z}from"./site-y5djcndq.js";var o="MSFT_sRGBFactors";class Z0{constructor(e){this.name=o,this._loader=e,this.enabled=this._loader.isExtensionUsed(o)}dispose(){this._loader=null}loadMaterialPropertiesAsync(e,s,t){return H.LoadExtraAsync(e,s,this.name,async(l,n)=>{if(n){let r=this._loader._getOrCreateMaterialAdapter(t),c=this._loader.loadMaterialPropertiesAsync(e,s,t),a=t.getScene().getEngine().useExactSrgbConversions;if(!r.baseColorTexture)r.baseColor.toLinearSpaceToRef(r.baseColor,a);if(!r.specularColorTexture)r.specularColor.toLinearSpaceToRef(r.specularColor,a);return await c}})}}var i=!1;function K0(){if(i)return;i=!0,Z(o),K(o,!0,(e)=>new Z0(e))}K0();
export{Z0,K0};

//# debugId=5E7187DE161E7AA564756E2164756E21
//# sourceMappingURL=site-6rmx4fdx.js.map
