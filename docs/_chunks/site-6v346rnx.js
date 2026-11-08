import{le,H}from"./site-ays616pe.js";import{K,Z}from"./site-ac958wa7.js";var t="EXT_texture_webp";class IT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,i)=>{let a=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,i.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function wT(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new IT(e))}wT();
export{IT,wT};

//# debugId=67987ECF52C5832464756E2164756E21
//# sourceMappingURL=site-6v346rnx.js.map
