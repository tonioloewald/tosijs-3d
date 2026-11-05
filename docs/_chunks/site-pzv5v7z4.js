import{K,Z}from"./site-nxqqjz2z.js";var r="ExtrasAsMetadata";class AT{_assignExtras(s,t){if(t.extras&&Object.keys(t.extras).length>0){let e=s.metadata=s.metadata||{},a=e.gltf=e.gltf||{};a.extras=t.extras}}constructor(s){this.name=r,this.enabled=!0,this._loader=s}dispose(){this._loader=null}loadNodeAsync(s,t,e){return this._loader.loadNodeAsync(s,t,(a)=>{this._assignExtras(a,t),e(a)})}loadCameraAsync(s,t,e){return this._loader.loadCameraAsync(s,t,(a)=>{this._assignExtras(a,t),e(a)})}createMaterial(s,t,e){let a=this._loader.createMaterial(s,t,e);return this._assignExtras(a,t),a}loadAnimationAsync(s,t){return this._loader.loadAnimationAsync(s,t).then((e)=>(this._assignExtras(e,t),e))}}var i=!1;function ET(){if(i)return;i=!0,Z(r),K(r,!1,(s)=>new AT(s))}ET();
export{AT,ET};

//# debugId=89D5644A5036E5EF64756E2164756E21
//# sourceMappingURL=site-pzv5v7z4.js.map
