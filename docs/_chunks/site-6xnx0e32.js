import{it}from"./site-3t3g319r.js";import{w,mt}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class om extends it{constructor(e){super(e);this.body=this.registerDataInput("body",w),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function am(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",om)}am();
export{om,am};

//# debugId=9ADF2F2CE9E41C7964756E2164756E21
//# sourceMappingURL=site-6xnx0e32.js.map
