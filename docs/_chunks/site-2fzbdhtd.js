import{Ef as H,Ff as I}from"./site-hzjsqcbq.js";var z="ExtrasAsMetadata";class J{_assignExtras(k,h){if(h.extras&&Object.keys(h.extras).length>0){let q=k.metadata=k.metadata||{},v=q.gltf=q.gltf||{};v.extras=h.extras}}constructor(k){this.name=z,this.enabled=!0,this._loader=k}dispose(){this._loader=null}loadNodeAsync(k,h,q){return this._loader.loadNodeAsync(k,h,(v)=>{this._assignExtras(v,h),q(v)})}loadCameraAsync(k,h,q){return this._loader.loadCameraAsync(k,h,(v)=>{this._assignExtras(v,h),q(v)})}createMaterial(k,h,q){let v=this._loader.createMaterial(k,h,q);return this._assignExtras(v,h),v}loadAnimationAsync(k,h){return this._loader.loadAnimationAsync(k,h).then((q)=>{return this._assignExtras(q,h),q})}}var B=!1;function K(){if(B)return;B=!0,I(z),H(z,!1,(k)=>new J(k))}K();
export{J as Bb,K as Cb};

//# debugId=4C76F53CC1483FA764756E2164756E21
//# sourceMappingURL=site-2fzbdhtd.js.map
