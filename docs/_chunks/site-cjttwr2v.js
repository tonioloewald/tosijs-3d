import{ne as H}from"./site-ycdhzx7n.js";import{Ef as B,Ff as D}from"./site-hzjsqcbq.js";var v="MSFT_minecraftMesh";class I{constructor(q){this.name=v,this._loader=q,this.enabled=this._loader.isExtensionUsed(v)}dispose(){this._loader=null}loadMaterialPropertiesAsync(q,w,k){return H.LoadExtraAsync(q,w,this.name,async(K,O)=>{if(O){if(!this._loader._pbrMaterialImpls.get("pbr"))throw Error(`${K}: Material type not supported`);let P=this._loader.loadMaterialPropertiesAsync(q,w,k);if(k.needAlphaBlending())k.forceDepthWrite=!0,k.separateCullingPass=!0;return k.backFaceCulling=k.forceDepthWrite,k.twoSidedLighting=!0,await P}})}}var z=!1;function J(){if(z)return;z=!0,D(v),B(v,!0,(q)=>new I(q))}J();
export{I as S,J as T};

//# debugId=6A771A9952916A0F64756E2164756E21
//# sourceMappingURL=site-cjttwr2v.js.map
