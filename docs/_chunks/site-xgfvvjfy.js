import{it}from"./site-3t3g319r.js";import{w,mt}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class lm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function cm(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",lm)}cm();
export{lm,cm};

//# debugId=24915239583E652264756E2164756E21
//# sourceMappingURL=site-xgfvvjfy.js.map
