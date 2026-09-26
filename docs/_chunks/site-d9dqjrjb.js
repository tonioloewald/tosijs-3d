import{le,H}from"./site-qwzjxgka.js";import{q,Q}from"./site-538xen72.js";var t="KHR_texture_basisu";class h0{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,a)=>{let i=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,a.source);return await this._loader._createTextureAsync(e,i,l,(u)=>{o(u)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var s=!1;function f0(){if(s)return;s=!0,Q(t),q(t,!0,(e)=>new h0(e))}f0();
export{h0,f0};

//# debugId=55C6A41B2959797664756E2164756E21
//# sourceMappingURL=site-d9dqjrjb.js.map
