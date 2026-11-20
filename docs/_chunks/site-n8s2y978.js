import{J,K}from"./site-5d3gdg3n.js";var e="KHR_xmp_json_ld";class jS{constructor(t){this.name=e,this.order=100,this._loader=t,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}onLoading(){if(this._loader.rootBabylonMesh===null)return;let t=this._loader.gltf.extensions?.KHR_xmp_json_ld,o=this._loader.gltf.asset?.extensions?.KHR_xmp_json_ld;if(t&&o){let s=+o.packet;if(t.packets&&s<t.packets.length)this._loader.rootBabylonMesh.metadata=this._loader.rootBabylonMesh.metadata||{},this._loader.rootBabylonMesh.metadata.xmp=t.packets[s]}}}var r=!1;function QS(){if(r)return;r=!0,K(e),J(e,!0,(t)=>new jS(t))}QS();
export{jS,QS};

//# debugId=B0F8B3500A8A578364756E2164756E21
//# sourceMappingURL=site-n8s2y978.js.map
