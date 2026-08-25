import{Ut as l}from"./site-ktyw28d4.js";import{ku as r,pu as e}from"./site-86tpqddf.js";import{sE as o}from"./site-yf4sr5jd.js";class p extends l{constructor(t){super(t);this.body=this.registerDataInput("body",r),this.impulse=this.registerDataInput("impulse",e),this.location=this.registerDataInput("location",e)}_execute(t,h){let i=this.body.getValue(t);if(!i){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let u=this.impulse.getValue(t),c=this.location.getValue(t);i.applyImpulse(u,c),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var s=!1;function a(){if(s)return;s=!0,o("FlowGraphApplyImpulseBlock",p)}a();
export{p as Zm,a as _m};

//# debugId=F983CC0EF0C0224C64756E2164756E21
//# sourceMappingURL=site-qs4qy94j.js.map
