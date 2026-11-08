import{le,H}from"./site-ays616pe.js";import{K,Z}from"./site-ac958wa7.js";var t="KHR_texture_basisu";class Fy{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,a)=>{let i=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,a.source);return await this._loader._createTextureAsync(e,i,l,(u)=>{o(u)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var s=!1;function ky(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new Fy(e))}ky();
export{Fy,ky};

//# debugId=659F363DD1FD236964756E2164756E21
//# sourceMappingURL=site-mv1mayjj.js.map
