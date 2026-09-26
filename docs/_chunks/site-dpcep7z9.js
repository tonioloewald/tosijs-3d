import{U}from"./site-xv6m73df.js";import{j,Y}from"./site-jzy5dg86.js";var t="MSFT_minecraftMesh";class KS{constructor(r){this.name=t,this._loader=r,this.enabled=this._loader.isExtensionUsed(t)}dispose(){this._loader=null}loadMaterialPropertiesAsync(r,s,e){return U.LoadExtraAsync(r,s,this.name,async(o,n)=>{if(n){if(!this._loader._pbrMaterialImpls.get("pbr"))throw Error(`${o}: Material type not supported`);let p=this._loader.loadMaterialPropertiesAsync(r,s,e);if(e.needAlphaBlending())e.forceDepthWrite=!0,e.separateCullingPass=!0;return e.backFaceCulling=e.forceDepthWrite,e.twoSidedLighting=!0,await p}})}}var i=!1;function ZS(){if(i)return;i=!0,Y(t),j(t,!0,(r)=>new KS(r))}ZS();
export{KS,ZS};

//# debugId=98A1440739F027DB64756E2164756E21
//# sourceMappingURL=site-dpcep7z9.js.map
