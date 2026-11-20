import{le,H}from"./site-48801y64.js";import{J,K}from"./site-5d3gdg3n.js";var t="EXT_texture_webp";class VT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return H.LoadExtensionAsync(e,r,this.name,async(n,i)=>{let a=r.sampler==null?H.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,i.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function zT(){if(s)return;s=!0,K(t),J(t,!0,(e)=>new VT(e))}zT();
export{VT,zT};

//# debugId=3BF1F6B30C84BA9864756E2164756E21
//# sourceMappingURL=site-nxpk7r34.js.map
