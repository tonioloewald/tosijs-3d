import{Ut as a}from"./site-ktyw28d4.js";import{ku as s,pu as o}from"./site-86tpqddf.js";import{sE as i}from"./site-yf4sr5jd.js";class l extends a{constructor(t){super(t);this.body=this.registerDataInput("body",s),this.force=this.registerDataInput("force",o),this.location=this.registerDataInput("location",o)}_execute(t,n){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let p=this.force.getValue(t),h=this.location.getValue(t);r.applyForce(p,h),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function c(){if(e)return;e=!0,i("FlowGraphApplyForceBlock",l)}c();
export{l as yn,c as zn};

//# debugId=0DF263883AFAA5CD64756E2164756E21
//# sourceMappingURL=site-a3myq05v.js.map
