import{H}from"./site-esgkawtm.js";import{K,Z}from"./site-jfk529r4.js";import{m}from"./site-3d4z7hnp.js";var e="KHR_texture_transform";class Yy{constructor(o){this.name=e,this._loader=o,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}loadTextureInfoAsync(o,s,i){return H.LoadExtensionAsync(o,s,this.name,async(a,r)=>await this._loader.loadTextureInfoAsync(o,s,(t)=>{if(!(t instanceof m))throw Error(`${a}: Texture type not supported`);if(r.offset)t.uOffset=r.offset[0],t.vOffset=r.offset[1];if(t.uRotationCenter=0,t.vRotationCenter=0,r.rotation)t.wAng=-r.rotation;if(r.scale)t.uScale=r.scale[0],t.vScale=r.scale[1];if(r.texCoord!=null)t.coordinatesIndex=r.texCoord;i(t)}))}}var f=!1;function Xy(){if(f)return;f=!0,Z(e),K(e,!0,(o)=>new Yy(o))}Xy();
export{Yy,Xy};

//# debugId=A0DE713F5285F23464756E2164756E21
//# sourceMappingURL=site-skj1z3e7.js.map
