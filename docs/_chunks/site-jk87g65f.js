import{le as w,ne as z}from"./site-ycdhzx7n.js";import{Ef as D,Ff as H}from"./site-hzjsqcbq.js";var q="EXT_texture_avif";class J{constructor(h){this.name=q,this._loader=h,this.enabled=h.isExtensionUsed(q)}dispose(){this._loader=null}_loadTextureAsync(h,k,O){return z.LoadExtensionAsync(h,k,this.name,async(P,Q)=>{let S=k.sampler==null?z.DefaultSampler:w.Get(`${h}/sampler`,this._loader.gltf.samplers,k.sampler),V=w.Get(`${P}/source`,this._loader.gltf.images,Q.source);return await this._loader._createTextureAsync(h,S,V,(W)=>{O(W)},void 0,!k._textureInfo.nonColorData)})}}var B=!1;function K(){if(B)return;B=!0,H(q),D(q,!0,(h)=>new J(h))}K();
export{J as xb,K as yb};

//# debugId=8E095F825E98298564756E2164756E21
//# sourceMappingURL=site-jk87g65f.js.map
