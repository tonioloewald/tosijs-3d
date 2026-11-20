import{H}from"./site-48801y64.js";import{J,K}from"./site-5d3gdg3n.js";var t="MSFT_minecraftMesh";class TS{constructor(r){this.name=t,this._loader=r,this.enabled=this._loader.isExtensionUsed(t)}dispose(){this._loader=null}loadMaterialPropertiesAsync(r,s,e){return H.LoadExtraAsync(r,s,this.name,async(o,n)=>{if(n){if(!this._loader._pbrMaterialImpls.get("pbr"))throw Error(`${o}: Material type not supported`);let p=this._loader.loadMaterialPropertiesAsync(r,s,e);if(e.needAlphaBlending())e.forceDepthWrite=!0,e.separateCullingPass=!0;return e.backFaceCulling=e.forceDepthWrite,e.twoSidedLighting=!0,await p}})}}var i=!1;function CS(){if(i)return;i=!0,K(t),J(t,!0,(r)=>new TS(r))}CS();
export{TS,CS};

//# debugId=1D25902B7079931464756E2164756E21
//# sourceMappingURL=site-anh4je76.js.map
