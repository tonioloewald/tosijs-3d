import{ae,U}from"./site-xv6m73df.js";import{j,Y}from"./site-jzy5dg86.js";var t="KHR_texture_basisu";class zS{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return U.LoadExtensionAsync(e,r,this.name,async(n,a)=>{let i=r.sampler==null?U.DefaultSampler:ae.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=ae.Get(`${n}/source`,this._loader.gltf.images,a.source);return await this._loader._createTextureAsync(e,i,l,(u)=>{o(u)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var s=!1;function US(){if(s)return;s=!0,Y(t),j(t,!0,(e)=>new zS(e))}US();
export{zS,US};

//# debugId=D6C2A11A5B343B0964756E2164756E21
//# sourceMappingURL=site-va8mz5jq.js.map
