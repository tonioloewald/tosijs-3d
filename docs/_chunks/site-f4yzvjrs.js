import{le,H}from"./site-qpqtr54r.js";import{K,Z}from"./site-nxqqjz2z.js";var t="KHR_texture_basisu";class My{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,a)=>{let i=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,a.source);return await this._loader._createTextureAsync(e,i,l,(u)=>{o(u)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var s=!1;function Dy(){if(s)return;s=!0,Z(t),K(t,!0,(e)=>new My(e))}Dy();
export{My,Dy};

//# debugId=35F941D1A916613264756E2164756E21
//# sourceMappingURL=site-f4yzvjrs.js.map
