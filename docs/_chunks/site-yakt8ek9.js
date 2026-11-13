import{K,Z}from"./site-jfk529r4.js";var e="KHR_xmp_json_ld";class $y{constructor(t){this.name=e,this.order=100,this._loader=t,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}onLoading(){if(this._loader.rootBabylonMesh===null)return;let t=this._loader.gltf.extensions?.KHR_xmp_json_ld,o=this._loader.gltf.asset?.extensions?.KHR_xmp_json_ld;if(t&&o){let s=+o.packet;if(t.packets&&s<t.packets.length)this._loader.rootBabylonMesh.metadata=this._loader.rootBabylonMesh.metadata||{},this._loader.rootBabylonMesh.metadata.xmp=t.packets[s]}}}var r=!1;function jy(){if(r)return;r=!0,Z(e),K(e,!0,(t)=>new $y(t))}jy();
export{$y,jy};

//# debugId=3CE8D8BE06C109D464756E2164756E21
//# sourceMappingURL=site-yakt8ek9.js.map
