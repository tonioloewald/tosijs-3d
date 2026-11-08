import{le,H}from"./site-ays616pe.js";import{K,Z}from"./site-ac958wa7.js";var t="EXT_texture_avif";class ET{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(i,n)=>{let a=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${i}/source`,this._loader.gltf.images,n.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function RT(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new ET(e))}RT();
export{ET,RT};

//# debugId=82EBF83B9E8CA29964756E2164756E21
//# sourceMappingURL=site-f1h7nq0r.js.map
