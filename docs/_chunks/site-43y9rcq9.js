import{le,H}from"./site-k43e79zf.js";import{K,Z}from"./site-7tkgwrht.js";var t="EXT_texture_webp";class yT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,i)=>{let a=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,i.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function TT(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new yT(e))}TT();
export{yT,TT};

//# debugId=F1F010E711F6B65F64756E2164756E21
//# sourceMappingURL=site-43y9rcq9.js.map
