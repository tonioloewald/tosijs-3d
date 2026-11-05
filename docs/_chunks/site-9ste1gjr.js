import{le,H}from"./site-qpqtr54r.js";import{K,Z}from"./site-nxqqjz2z.js";var t="EXT_texture_webp";class TT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,i)=>{let a=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,i.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function CT(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new TT(e))}CT();
export{TT,CT};

//# debugId=AD69DA4476DE601F64756E2164756E21
//# sourceMappingURL=site-9ste1gjr.js.map
