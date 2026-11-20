import{le,H}from"./site-48801y64.js";import{J,K}from"./site-5d3gdg3n.js";var t="KHR_texture_basisu";class HS{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,a)=>{let i=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,a.source);return await this._loader._createTextureAsync(e,i,l,(u)=>{o(u)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var s=!1;function YS(){if(s)return;s=!0,K(t),J(t,!0,(e)=>new HS(e))}YS();
export{HS,YS};

//# debugId=BE5A57B963495DA564756E2164756E21
//# sourceMappingURL=site-5h7p3zpg.js.map
