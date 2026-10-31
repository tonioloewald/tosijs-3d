import{le,H}from"./site-k43e79zf.js";import{K,Z}from"./site-7tkgwrht.js";var t="KHR_texture_basisu";class wy{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,a)=>{let i=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,a.source);return await this._loader._createTextureAsync(e,i,l,(u)=>{o(u)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var s=!1;function My(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new wy(e))}My();
export{wy,My};

//# debugId=550BD7F6C357F11964756E2164756E21
//# sourceMappingURL=site-3exfmjhx.js.map
