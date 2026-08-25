import{Ef as n,Ff as o}from"./site-2py380ff.js";var r="ExtrasAsMetadata";class d{_assignExtras(s,t){if(t.extras&&Object.keys(t.extras).length>0){let e=s.metadata=s.metadata||{},a=e.gltf=e.gltf||{};a.extras=t.extras}}constructor(s){this.name=r,this.enabled=!0,this._loader=s}dispose(){this._loader=null}loadNodeAsync(s,t,e){return this._loader.loadNodeAsync(s,t,(a)=>{this._assignExtras(a,t),e(a)})}loadCameraAsync(s,t,e){return this._loader.loadCameraAsync(s,t,(a)=>{this._assignExtras(a,t),e(a)})}createMaterial(s,t,e){let a=this._loader.createMaterial(s,t,e);return this._assignExtras(a,t),a}loadAnimationAsync(s,t){return this._loader.loadAnimationAsync(s,t).then((e)=>(this._assignExtras(e,t),e))}}var i=!1;function l(){if(i)return;i=!0,o(r),n(r,!1,(s)=>new d(s))}l();
export{d as Bb,l as Cb};

//# debugId=A8FE6DB551D4ABF064756E2164756E21
//# sourceMappingURL=site-ye0zrbp0.js.map
