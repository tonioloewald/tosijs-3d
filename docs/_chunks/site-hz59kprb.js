import{it}from"./site-j6ranrbs.js";import{w,mt}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class tm extends it{constructor(e){super(e);this.body=this.registerDataInput("body",w),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function im(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",tm)}im();
export{tm,im};

//# debugId=FB09DBF164F8581964756E2164756E21
//# sourceMappingURL=site-hz59kprb.js.map
