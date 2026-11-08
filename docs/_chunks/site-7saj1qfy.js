import{it}from"./site-2z9zdtr9.js";import{w,mt}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class Jp extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.impulse=this.registerDataInput("impulse",mt),this.location=this.registerDataInput("location",mt)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),r=this.location.getValue(t);e.applyImpulse(s,r),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function em(){if(i)return;i=!0,o("FlowGraphApplyImpulseBlock",Jp)}em();
export{Jp,em};

//# debugId=933C91E5681D9A5464756E2164756E21
//# sourceMappingURL=site-7saj1qfy.js.map
