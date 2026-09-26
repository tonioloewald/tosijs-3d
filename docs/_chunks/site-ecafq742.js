import{j,Y}from"./site-jzy5dg86.js";var e="KHR_xmp_json_ld";class XS{constructor(t){this.name=e,this.order=100,this._loader=t,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}onLoading(){if(this._loader.rootBabylonMesh===null)return;let t=this._loader.gltf.extensions?.KHR_xmp_json_ld,o=this._loader.gltf.asset?.extensions?.KHR_xmp_json_ld;if(t&&o){let s=+o.packet;if(t.packets&&s<t.packets.length)this._loader.rootBabylonMesh.metadata=this._loader.rootBabylonMesh.metadata||{},this._loader.rootBabylonMesh.metadata.xmp=t.packets[s]}}}var r=!1;function YS(){if(r)return;r=!0,Y(e),j(e,!0,(t)=>new XS(t))}YS();
export{XS,YS};

//# debugId=480A6B70641D49BD64756E2164756E21
//# sourceMappingURL=site-ecafq742.js.map
