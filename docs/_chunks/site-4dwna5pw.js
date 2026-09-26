import{H}from"./site-qwzjxgka.js";import{q,Q}from"./site-538xen72.js";var t="MSFT_minecraftMesh";class S0{constructor(r){this.name=t,this._loader=r,this.enabled=this._loader.isExtensionUsed(t)}dispose(){this._loader=null}loadMaterialPropertiesAsync(r,s,e){return H.LoadExtraAsync(r,s,this.name,async(o,n)=>{if(n){if(!this._loader._pbrMaterialImpls.get("pbr"))throw Error(`${o}: Material type not supported`);let p=this._loader.loadMaterialPropertiesAsync(r,s,e);if(e.needAlphaBlending())e.forceDepthWrite=!0,e.separateCullingPass=!0;return e.backFaceCulling=e.forceDepthWrite,e.twoSidedLighting=!0,await p}})}}var i=!1;function y0(){if(i)return;i=!0,Q(t),q(t,!0,(r)=>new S0(r))}y0();
export{S0,y0};

//# debugId=9926FB1E3689C10564756E2164756E21
//# sourceMappingURL=site-4dwna5pw.js.map
