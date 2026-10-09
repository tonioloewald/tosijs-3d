import{le,W}from"./site-c4gqr73k.js";import{q,Q}from"./site-1fsbjacg.js";var t="EXT_texture_webp";class hT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return W.LoadExtensionAsync(e,r,this.name,async(n,i)=>{let a=r.sampler==null?W.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,i.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function fT(){if(s)return;s=!0,Q(t),q(t,!0,(e)=>new hT(e))}fT();
export{hT,fT};

//# debugId=D485209DEA41DD8464756E2164756E21
//# sourceMappingURL=site-qp36ttkd.js.map
