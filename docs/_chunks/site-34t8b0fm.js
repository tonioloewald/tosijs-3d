import{le as s,ne as o}from"./site-v8h137ww.js";import{Ef as n,Ff as a}from"./site-2py380ff.js";var t="EXT_texture_avif";class l{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,f){return o.LoadExtensionAsync(e,r,this.name,async(u,d)=>{let p=r.sampler==null?o.DefaultSampler:s.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),_=s.Get(`${u}/source`,this._loader.gltf.images,d.source);return await this._loader._createTextureAsync(e,p,_,(c)=>{f(c)},void 0,!r._textureInfo.nonColorData)})}}var i=!1;function m(){if(i)return;i=!0,a(t),n(t,!0,(e)=>new l(e))}m();
export{l as xb,m as yb};

//# debugId=99AE9028E96155CC64756E2164756E21
//# sourceMappingURL=site-34t8b0fm.js.map
