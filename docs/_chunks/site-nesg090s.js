import{le as q,ne as v}from"./site-ycdhzx7n.js";import{Ef as B,Ff as D}from"./site-hzjsqcbq.js";var k="EXT_texture_webp";class H{constructor(f){this.name=k,this._loader=f,this.enabled=f.isExtensionUsed(k)}dispose(){this._loader=null}_loadTextureAsync(f,h,K){return v.LoadExtensionAsync(f,h,this.name,async(O,P)=>{let Q=h.sampler==null?v.DefaultSampler:q.Get(`${f}/sampler`,this._loader.gltf.samplers,h.sampler),S=q.Get(`${O}/source`,this._loader.gltf.images,P.source);return await this._loader._createTextureAsync(f,Q,S,(V)=>{K(V)},void 0,!h._textureInfo.nonColorData)})}}var z=!1;function J(){if(z)return;z=!0,D(k),B(k,!0,(f)=>new H(f))}J();
export{H as zb,J as Ab};

//# debugId=B2D27CE289FB720664756E2164756E21
//# sourceMappingURL=site-nesg090s.js.map
