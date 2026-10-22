import{H}from"./site-vac3fsxe.js";import{K,Z}from"./site-y5djcndq.js";var t="MSFT_minecraftMesh";class Q0{constructor(r){this.name=t,this._loader=r,this.enabled=this._loader.isExtensionUsed(t)}dispose(){this._loader=null}loadMaterialPropertiesAsync(r,s,e){return H.LoadExtraAsync(r,s,this.name,async(o,n)=>{if(n){if(!this._loader._pbrMaterialImpls.get("pbr"))throw Error(`${o}: Material type not supported`);let p=this._loader.loadMaterialPropertiesAsync(r,s,e);if(e.needAlphaBlending())e.forceDepthWrite=!0,e.separateCullingPass=!0;return e.backFaceCulling=e.forceDepthWrite,e.twoSidedLighting=!0,await p}})}}var i=!1;function q0(){if(i)return;i=!0,Z(t),K(t,!0,(r)=>new Q0(r))}q0();
export{Q0,q0};

//# debugId=1B2E81636F16E0EA64756E2164756E21
//# sourceMappingURL=site-c3r3pw89.js.map
