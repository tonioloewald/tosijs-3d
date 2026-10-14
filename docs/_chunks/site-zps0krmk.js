import{le,W}from"./site-8fb81bsh.js";import{Z,q}from"./site-2yemvwby.js";var t="EXT_texture_avif";class cT{constructor(e){this.name=t,this._loader=e,this.enabled=e.isExtensionUsed(t)}dispose(){this._loader=null}_loadTextureAsync(e,r,o){return W.LoadExtensionAsync(e,r,this.name,async(i,n)=>{let a=r.sampler==null?W.DefaultSampler:le.Get(`${e}/sampler`,this._loader.gltf.samplers,r.sampler),l=le.Get(`${i}/source`,this._loader.gltf.images,n.source);return await this._loader._createTextureAsync(e,a,l,(m)=>{o(m)},void 0,!r._textureInfo.nonColorData)})}}var s=!1;function uT(){if(s)return;s=!0,q(t),Z(t,!0,(e)=>new cT(e))}uT();
export{cT,uT};

//# debugId=E6DDF67D2BCFFF7E64756E2164756E21
//# sourceMappingURL=site-zps0krmk.js.map
