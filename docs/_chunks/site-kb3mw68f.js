import{Ef as n,Ff as a}from"./site-2py380ff.js";var e="KHR_xmp_json_ld";class i{constructor(t){this.name=e,this.order=100,this._loader=t,this.enabled=this._loader.isExtensionUsed(e)}dispose(){this._loader=null}onLoading(){if(this._loader.rootBabylonMesh===null)return;let t=this._loader.gltf.extensions?.KHR_xmp_json_ld,o=this._loader.gltf.asset?.extensions?.KHR_xmp_json_ld;if(t&&o){let s=+o.packet;if(t.packets&&s<t.packets.length)this._loader.rootBabylonMesh.metadata=this._loader.rootBabylonMesh.metadata||{},this._loader.rootBabylonMesh.metadata.xmp=t.packets[s]}}}var r=!1;function l(){if(r)return;r=!0,a(e),n(e,!0,(t)=>new i(t))}l();
export{i as qa,l as ra};

//# debugId=79CB762E30A2797164756E2164756E21
//# sourceMappingURL=site-kb3mw68f.js.map
