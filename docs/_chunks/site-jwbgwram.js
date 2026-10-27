import{le,H}from"./site-htw4djkb.js";import{K,Z}from"./site-y5djcndq.js";var t="KHR_texture_basisu";class gy{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,a)=>{let i=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,a.source);return await this._loader._createTextureAsync(e,i,l,(u)=>{o(u)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var s=!1;function _y(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new gy(e))}_y();
export{gy,_y};

//# debugId=F3B1033B43619CEA64756E2164756E21
//# sourceMappingURL=site-jwbgwram.js.map
