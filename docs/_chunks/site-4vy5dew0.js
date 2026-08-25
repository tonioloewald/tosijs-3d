import{le as s,ne as o}from"./site-v8h137ww.js";import{Ef as i,Ff as a}from"./site-2py380ff.js";var t="EXT_texture_webp";class l{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,p){return o.LoadExtensionAsync(e,r,this.name,async(u,d)=>{let _=r.sampler==null?o.DefaultSampler:s.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),f=s.Get(`${u}/source`,this._loader.gltf.images,d.source);return await this._loader._createTextureAsync(e,_,f,(c)=>{p(c)},void 0,!r._textureInfo.nonColorData)})}}var n=!1;function m(){if(n)return;n=!0,a(t),i(t,!0,(e)=>new l(e))}m();
export{l as zb,m as Ab};

//# debugId=8079192BCB5A07B264756E2164756E21
//# sourceMappingURL=site-4vy5dew0.js.map
