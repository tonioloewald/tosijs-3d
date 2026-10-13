import{le,W}from"./site-jc98es8d.js";import{Z,q}from"./site-2yemvwby.js";var t="EXT_texture_webp";class hT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return W.LoadExtensionAsync(e,r,this.name,async(n,i)=>{let a=r.sampler==null?W.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,i.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function fT(){if(s)return;s=!0,q(t),Z(t,!0,(e)=>new hT(e))}fT();
export{hT,fT};

//# debugId=628F3ED1E6AB59C164756E2164756E21
//# sourceMappingURL=site-ng3mmkp3.js.map
