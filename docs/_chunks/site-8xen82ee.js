import{Vs as l}from"./site-gda1mzz6.js";import{lt as r,qt as e}from"./site-rrva3mwb.js";import{hG as o}from"./site-qd0cy957.js";class p extends l{constructor(t){super(t);this.body=this.registerDataInput("body",r),this.impulse=this.registerDataInput("impulse",e),this.location=this.registerDataInput("location",e)}_execute(t,h){let i=this.body.getValue(t);if(!i){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let u=this.impulse.getValue(t),c=this.location.getValue(t);i.applyImpulse(u,c),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var s=!1;function a(){if(s)return;s=!0,o("FlowGraphApplyImpulseBlock",p)}a();
export{p as jn,a as kn};

//# debugId=435AF34BDB49A89664756E2164756E21
//# sourceMappingURL=site-8xen82ee.js.map
