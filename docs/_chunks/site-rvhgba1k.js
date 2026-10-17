import{H}from"./site-10chp8j8.js";import{K,Z}from"./site-y5djcndq.js";var t="MSFT_minecraftMesh";class Qy{constructor(r){this.name=t,this._loader=r,this.enabled=this._loader.isExtensionUsed(t)}dispose(){this._loader=null}loadMaterialPropertiesAsync(r,s,e){return H.LoadExtraAsync(r,s,this.name,async(o,n)=>{if(n){if(!this._loader._pbrMaterialImpls.get("pbr"))throw Error(`${o}: Material type not supported`);let p=this._loader.loadMaterialPropertiesAsync(r,s,e);if(e.needAlphaBlending())e.forceDepthWrite=!0,e.separateCullingPass=!0;return e.backFaceCulling=e.forceDepthWrite,e.twoSidedLighting=!0,await p}})}}var i=!1;function qy(){if(i)return;i=!0,Z(t),K(t,!0,(r)=>new Qy(r))}qy();
export{Qy,qy};

//# debugId=B956AC4B920E1A7564756E2164756E21
//# sourceMappingURL=site-rvhgba1k.js.map
