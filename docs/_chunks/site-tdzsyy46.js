import{it}from"./site-j6ranrbs.js";import{w,mt}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class rm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function sm(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",rm)}sm();
export{rm,sm};

//# debugId=ECBE5B2AFA0520A764756E2164756E21
//# sourceMappingURL=site-tdzsyy46.js.map
