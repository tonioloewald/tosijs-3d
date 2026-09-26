import{q,Q}from"./site-538xen72.js";var e="KHR_xmp_json_ld";class m0{constructor(t){this.name=e,this.order=100,this._loader=t,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}onLoading(){if(this._loader.rootBabylonMesh===null)return;let t=this._loader.gltf.extensions?.KHR_xmp_json_ld,o=this._loader.gltf.asset?.extensions?.KHR_xmp_json_ld;if(t&&o){let s=+o.packet;if(t.packets&&s<t.packets.length)this._loader.rootBabylonMesh.metadata=this._loader.rootBabylonMesh.metadata||{},this._loader.rootBabylonMesh.metadata.xmp=t.packets[s]}}}var r=!1;function _0(){if(r)return;r=!0,Q(e),q(e,!0,(t)=>new m0(t))}_0();
export{m0,_0};

//# debugId=B20F6DA64A54E1DE64756E2164756E21
//# sourceMappingURL=site-xbtpvw4a.js.map
