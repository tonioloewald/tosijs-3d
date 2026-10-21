import{le,H}from"./site-atga1d4f.js";import{K,Z}from"./site-y5djcndq.js";var t="KHR_texture_basisu";class _y{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,a)=>{let i=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,a.source);return await this._loader._createTextureAsync(e,i,l,(u)=>{o(u)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var s=!1;function gy(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new _y(e))}gy();
export{_y,gy};

//# debugId=9A8937C075E5256E64756E2164756E21
//# sourceMappingURL=site-21f0zyhs.js.map
