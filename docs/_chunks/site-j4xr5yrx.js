import{ne as O}from"./site-ycdhzx7n.js";import{Ef as D,Ff as J}from"./site-hzjsqcbq.js";import{Hw as B}from"./site-87szazem.js";var v="KHR_texture_transform";class P{constructor(q){this.name=v,this._loader=q,this.enabled=this._loader.isExtensionUsed(v)}dispose(){this._loader=null}loadTextureInfoAsync(q,w,S){return O.LoadExtensionAsync(q,w,this.name,async(V,h)=>{return await this._loader.loadTextureInfoAsync(q,w,(k)=>{if(!(k instanceof B))throw Error(`${V}: Texture type not supported`);if(h.offset)k.uOffset=h.offset[0],k.vOffset=h.offset[1];if(k.uRotationCenter=0,k.vRotationCenter=0,h.rotation)k.wAng=-h.rotation;if(h.scale)k.uScale=h.scale[0],k.vScale=h.scale[1];if(h.texCoord!=null)k.coordinatesIndex=h.texCoord;S(k)})})}}var z=!1;function Q(){if(z)return;z=!0,J(v),D(v,!0,(q)=>new P(q))}Q();
export{P as oa,Q as pa};

//# debugId=A3DFF4849C1D88A764756E2164756E21
//# sourceMappingURL=site-j4xr5yrx.js.map
