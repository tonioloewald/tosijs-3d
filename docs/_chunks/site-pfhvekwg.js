import{ne as n}from"./site-v8h137ww.js";import{Ef as a,Ff as d}from"./site-2py380ff.js";import{Hw as i}from"./site-0c1hf6dq.js";var e="KHR_texture_transform";class c{constructor(o){this.name=e,this._loader=o,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}loadTextureInfoAsync(o,s,p){return n.LoadExtensionAsync(o,s,this.name,async(u,r)=>await this._loader.loadTextureInfoAsync(o,s,(t)=>{if(!(t instanceof i))throw Error(`${u}: Texture type not supported`);if(r.offset)t.uOffset=r.offset[0],t.vOffset=r.offset[1];if(t.uRotationCenter=0,t.vRotationCenter=0,r.rotation)t.wAng=-r.rotation;if(r.scale)t.uScale=r.scale[0],t.vScale=r.scale[1];if(r.texCoord!=null)t.coordinatesIndex=r.texCoord;p(t)}))}}var f=!1;function m(){if(f)return;f=!0,d(e),a(e,!0,(o)=>new c(o))}m();
export{c as oa,m as pa};

//# debugId=0F3B6A8A4BF34EF664756E2164756E21
//# sourceMappingURL=site-pfhvekwg.js.map
