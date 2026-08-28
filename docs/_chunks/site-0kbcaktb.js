import{Nc as s,Pc as o}from"./site-6056gfrr.js";import{ie as a,je as i}from"./site-87nvg6e2.js";var t="KHR_texture_basisu";class l{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,m){return o.LoadExtensionAsync(e,r,this.name,async(f,_)=>{let d=r.sampler==null?o.DefaultSampler:s.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),p=s.Get(`${f}/source`,this._loader.gltf.images,_.source);return await this._loader._createTextureAsync(e,d,p,(c)=>{m(c)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var n=!1;function u(){if(n)return;n=!0,i(t),a(t,!0,(e)=>new l(e))}u();
export{l as Ka,u as La};

//# debugId=D561D39646708ADD64756E2164756E21
//# sourceMappingURL=site-0kbcaktb.js.map
