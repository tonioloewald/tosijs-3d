import{le,H}from"./site-k43e79zf.js";import{K,Z}from"./site-7tkgwrht.js";var t="EXT_texture_avif";class vT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(i,n)=>{let a=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${i}/source`,this._loader.gltf.images,n.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function ST(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new vT(e))}ST();
export{vT,ST};

//# debugId=AF08C91686092B3C64756E2164756E21
//# sourceMappingURL=site-58q93evt.js.map
