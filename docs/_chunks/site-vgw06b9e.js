import{it}from"./site-qyhmxwr1.js";import{w,mt}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class om extends it{constructor(e){super(e);this.body=this.registerDataInput("body",w),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function am(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",om)}am();
export{om,am};

//# debugId=9ADF2F2CE9E41C7964756E2164756E21
//# sourceMappingURL=site-vgw06b9e.js.map
