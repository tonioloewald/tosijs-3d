import{le,H}from"./site-qwzjxgka.js";import{q,Q}from"./site-538xen72.js";var t="EXT_texture_avif";class J0{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(i,n)=>{let a=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${i}/source`,this._loader.gltf.images,n.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function eT(){if(s)return;s=!0,Q(t),q(t,!0,(e)=>new J0(e))}eT();
export{J0,eT};

//# debugId=05FD1DB673CF1F1D64756E2164756E21
//# sourceMappingURL=site-wvgcqhsr.js.map
