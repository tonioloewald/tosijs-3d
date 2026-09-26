import{j,Y}from"./site-jzy5dg86.js";var r="ExtrasAsMetadata";class Dy{_assignExtras(s,t){if(t.extras&&Object.keys(t.extras).length>0){let e=s.metadata=s.metadata||{},a=e.gltf=e.gltf||{};a.extras=t.extras}}constructor(s){this.name=r,this.enabled=!0,this._loader=s}dispose(){this._loader=null}loadNodeAsync(s,t,e){return this._loader.loadNodeAsync(s,t,(a)=>{this._assignExtras(a,t),e(a)})}loadCameraAsync(s,t,e){return this._loader.loadCameraAsync(s,t,(a)=>{this._assignExtras(a,t),e(a)})}createMaterial(s,t,e){let a=this._loader.createMaterial(s,t,e);return this._assignExtras(a,t),a}loadAnimationAsync(s,t){return this._loader.loadAnimationAsync(s,t).then((e)=>(this._assignExtras(e,t),e))}}var i=!1;function Ny(){if(i)return;i=!0,Y(r),j(r,!1,(s)=>new Dy(s))}Ny();
export{Dy,Ny};

//# debugId=4C62B46A855EC7FA64756E2164756E21
//# sourceMappingURL=site-p7tt11y0.js.map
