import{it}from"./site-3t3g319r.js";import{w,mt}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class im extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.force=this.registerDataInput("force",mt),this.location=this.registerDataInput("location",mt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function rm(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",im)}rm();
export{im,rm};

//# debugId=2C93A60D904407CF64756E2164756E21
//# sourceMappingURL=site-c3dk39h1.js.map
