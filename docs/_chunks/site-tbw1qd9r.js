import{le,W}from"./site-jc98es8d.js";import{Z,q}from"./site-2yemvwby.js";var t="KHR_texture_basisu";class by{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return W.LoadExtensionAsync(e,r,this.name,async(n,a)=>{let i=r.sampler==null?W.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${n}/source`,this._loader.gltf.images,a.source);return await this._loader._createTextureAsync(e,i,l,(u)=>{o(u)},r._textureInfo.nonColorData?{useRGBAIfASTCBC7NotAvailableWhenUASTC:!0}:void 0,!r._textureInfo.nonColorData)})}}var s=!1;function Sy(){if(s)return;s=!0,q(t),Z(t,!0,(e)=>new by(e))}Sy();
export{by,Sy};

//# debugId=4F0399C27A4CDD2B64756E2164756E21
//# sourceMappingURL=site-tbw1qd9r.js.map
