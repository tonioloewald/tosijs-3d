import{K,Z}from"./site-r7783215.js";var e="KHR_xmp_json_ld";class Uy{constructor(t){this.name=e,this.order=100,this._loader=t,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}onLoading(){if(this._loader.rootBabylonMesh===null)return;let t=this._loader.gltf.extensions?.KHR_xmp_json_ld,o=this._loader.gltf.asset?.extensions?.KHR_xmp_json_ld;if(t&&o){let s=+o.packet;if(t.packets&&s<t.packets.length)this._loader.rootBabylonMesh.metadata=this._loader.rootBabylonMesh.metadata||{},this._loader.rootBabylonMesh.metadata.xmp=t.packets[s]}}}var r=!1;function Wy(){if(r)return;r=!0,Z(e),K(e,!0,(t)=>new Uy(t))}Wy();
export{Uy,Wy};

//# debugId=5229B3084E78EBE064756E2164756E21
//# sourceMappingURL=site-2061h0rm.js.map
