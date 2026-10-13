import{W}from"./site-jc98es8d.js";import{Z,q}from"./site-2yemvwby.js";var t="MSFT_minecraftMesh";class J0{constructor(r){this.name=t,this._loader=r,this.enabled=this._loader.isExtensionUsed(t)}dispose(){this._loader=null}loadMaterialPropertiesAsync(r,s,e){return W.LoadExtraAsync(r,s,this.name,async(o,n)=>{if(n){if(!this._loader._pbrMaterialImpls.get("pbr"))throw Error(`${o}: Material type not supported`);let p=this._loader.loadMaterialPropertiesAsync(r,s,e);if(e.needAlphaBlending())e.forceDepthWrite=!0,e.separateCullingPass=!0;return e.backFaceCulling=e.forceDepthWrite,e.twoSidedLighting=!0,await p}})}}var i=!1;function ey(){if(i)return;i=!0,q(t),Z(t,!0,(r)=>new J0(r))}ey();
export{J0,ey};

//# debugId=90EBE25C7AE879E264756E2164756E21
//# sourceMappingURL=site-g7c0jn07.js.map
