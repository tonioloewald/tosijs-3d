import{K,Z}from"./site-y5djcndq.js";var e="KHR_xmp_json_ld";class vy{constructor(t){this.name=e,this.order=100,this._loader=t,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}onLoading(){if(this._loader.rootBabylonMesh===null)return;let t=this._loader.gltf.extensions?.KHR_xmp_json_ld,o=this._loader.gltf.asset?.extensions?.KHR_xmp_json_ld;if(t&&o){let s=+o.packet;if(t.packets&&s<t.packets.length)this._loader.rootBabylonMesh.metadata=this._loader.rootBabylonMesh.metadata||{},this._loader.rootBabylonMesh.metadata.xmp=t.packets[s]}}}var r=!1;function Sy(){if(r)return;r=!0,Z(e),K(e,!0,(t)=>new vy(t))}Sy();
export{vy,Sy};

//# debugId=0584498F56C6798C64756E2164756E21
//# sourceMappingURL=site-8f3ezgv1.js.map
