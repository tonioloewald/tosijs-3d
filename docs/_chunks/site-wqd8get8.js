import{Nc as s,Pc as o}from"./site-6056gfrr.js";import{ie as i,je as a}from"./site-87nvg6e2.js";var t="EXT_texture_webp";class l{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,p){return o.LoadExtensionAsync(e,r,this.name,async(u,d)=>{let _=r.sampler==null?o.DefaultSampler:s.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),f=s.Get(`${u}/source`,this._loader.gltf.images,d.source);return await this._loader._createTextureAsync(e,_,f,(c)=>{p(c)},void 0,!r._textureInfo.nonColorData)})}}var n=!1;function m(){if(n)return;n=!0,a(t),i(t,!0,(e)=>new l(e))}m();
export{l as Fc,m as Gc};

//# debugId=AFE04771594D9FA864756E2164756E21
//# sourceMappingURL=site-wqd8get8.js.map
