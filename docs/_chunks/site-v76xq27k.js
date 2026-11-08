import{it}from"./site-2z9zdtr9.js";import{w,mt}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class tm extends it{constructor(e){super(e);this.body=this.registerDataInput("body",w),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function im(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",tm)}im();
export{tm,im};

//# debugId=FB09DBF164F8581964756E2164756E21
//# sourceMappingURL=site-v76xq27k.js.map
