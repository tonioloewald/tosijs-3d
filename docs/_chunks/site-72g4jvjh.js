import{H}from"./site-dk4rde76.js";import{K,Z}from"./site-r7783215.js";var t="MSFT_minecraftMesh";class _y{constructor(r){this.name=t,this._loader=r,this.enabled=this._loader.isExtensionUsed(t)}dispose(){this._loader=null}loadMaterialPropertiesAsync(r,s,e){return H.LoadExtraAsync(r,s,this.name,async(o,n)=>{if(n){if(!this._loader._pbrMaterialImpls.get("pbr"))throw Error(`${o}: Material type not supported`);let p=this._loader.loadMaterialPropertiesAsync(r,s,e);if(e.needAlphaBlending())e.forceDepthWrite=!0,e.separateCullingPass=!0;return e.backFaceCulling=e.forceDepthWrite,e.twoSidedLighting=!0,await p}})}}var i=!1;function xy(){if(i)return;i=!0,Z(t),K(t,!0,(r)=>new _y(r))}xy();
export{_y,xy};

//# debugId=21ED0BDA0448F9FF64756E2164756E21
//# sourceMappingURL=site-72g4jvjh.js.map
