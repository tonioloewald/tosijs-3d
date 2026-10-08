import{W}from"./site-bzp1m843.js";import{q,Q}from"./site-1fsbjacg.js";import{_}from"./site-aqxk3541.js";var e="KHR_texture_transform";class yy{constructor(o){this.name=e,this._loader=o,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}loadTextureInfoAsync(o,s,i){return W.LoadExtensionAsync(o,s,this.name,async(a,r)=>await this._loader.loadTextureInfoAsync(o,s,(t)=>{if(!(t instanceof _))throw Error(`${a}: Texture type not supported`);if(r.offset)t.uOffset=r.offset[0],t.vOffset=r.offset[1];if(t.uRotationCenter=0,t.vRotationCenter=0,r.rotation)t.wAng=-r.rotation;if(r.scale)t.uScale=r.scale[0],t.vScale=r.scale[1];if(r.texCoord!=null)t.coordinatesIndex=r.texCoord;i(t)}))}}var f=!1;function Ty(){if(f)return;f=!0,Q(e),q(e,!0,(o)=>new yy(o))}Ty();
export{yy,Ty};

//# debugId=2FF4208D7BD13F1864756E2164756E21
//# sourceMappingURL=site-ad3xefjb.js.map
