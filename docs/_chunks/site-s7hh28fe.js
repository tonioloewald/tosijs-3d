import{le,W}from"./site-7t46yw6q.js";import{q,Q}from"./site-1fsbjacg.js";var t="EXT_texture_avif";class cT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return W.LoadExtensionAsync(e,r,this.name,async(i,n)=>{let a=r.sampler==null?W.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${i}/source`,this._loader.gltf.images,n.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function uT(){if(s)return;s=!0,Q(t),q(t,!0,(e)=>new cT(e))}uT();
export{cT,uT};

//# debugId=14D5FEF631052D1B64756E2164756E21
//# sourceMappingURL=site-s7hh28fe.js.map
