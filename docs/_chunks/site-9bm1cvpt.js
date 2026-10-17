import{K,Z}from"./site-y5djcndq.js";var e="KHR_xmp_json_ld";class b0{constructor(t){this.name=e,this.order=100,this._loader=t,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}onLoading(){if(this._loader.rootBabylonMesh===null)return;let t=this._loader.gltf.extensions?.KHR_xmp_json_ld,o=this._loader.gltf.asset?.extensions?.KHR_xmp_json_ld;if(t&&o){let s=+o.packet;if(t.packets&&s<t.packets.length)this._loader.rootBabylonMesh.metadata=this._loader.rootBabylonMesh.metadata||{},this._loader.rootBabylonMesh.metadata.xmp=t.packets[s]}}}var r=!1;function S0(){if(r)return;r=!0,Z(e),K(e,!0,(t)=>new b0(t))}S0();
export{b0,S0};

//# debugId=8AA1183EA667166C64756E2164756E21
//# sourceMappingURL=site-9bm1cvpt.js.map
