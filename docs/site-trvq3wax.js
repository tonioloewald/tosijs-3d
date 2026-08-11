import{Ef as z,Ff as B}from"./site-em39wqsn.js";var h="KHR_xmp_json_ld";class C{constructor(b){this.name=h,this.order=100,this._loader=b,this.enabled=this._loader.isExtensionUsed(h)}dispose(){this._loader=null}onLoading(){if(this._loader.rootBabylonMesh===null)return;let b=this._loader.gltf.extensions?.KHR_xmp_json_ld,q=this._loader.gltf.asset?.extensions?.KHR_xmp_json_ld;if(b&&q){let v=+q.packet;if(b.packets&&v<b.packets.length)this._loader.rootBabylonMesh.metadata=this._loader.rootBabylonMesh.metadata||{},this._loader.rootBabylonMesh.metadata.xmp=b.packets[v]}}}var w=!1;function D(){if(w)return;w=!0,B(h),z(h,!0,(b)=>new C(b))}D();
export{C as qa,D as ra};

//# debugId=A5DF801121E5021E64756E2164756E21
//# sourceMappingURL=site-trvq3wax.js.map
