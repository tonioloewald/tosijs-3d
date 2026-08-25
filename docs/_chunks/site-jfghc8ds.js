import{ne as p}from"./site-v8h137ww.js";import{Ef as o,Ff as n}from"./site-2py380ff.js";var t="MSFT_minecraftMesh";class d{constructor(r){this.name=t,this._loader=r,this.enabled=this._loader.isExtensionUsed(t)}dispose(){this._loader=null}loadMaterialPropertiesAsync(r,s,e){return p.LoadExtraAsync(r,s,this.name,async(f,h)=>{if(h){if(!this._loader._pbrMaterialImpls.get("pbr"))throw Error(`${f}: Material type not supported`);let m=this._loader.loadMaterialPropertiesAsync(r,s,e);if(e.needAlphaBlending())e.forceDepthWrite=!0,e.separateCullingPass=!0;return e.backFaceCulling=e.forceDepthWrite,e.twoSidedLighting=!0,await m}})}}var i=!1;function c(){if(i)return;i=!0,n(t),o(t,!0,(r)=>new d(r))}c();
export{d as S,c as T};

//# debugId=B80346C8BE6BE0C264756E2164756E21
//# sourceMappingURL=site-jfghc8ds.js.map
