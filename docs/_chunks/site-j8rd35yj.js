import{it}from"./site-2z9zdtr9.js";import{w,mt}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class rm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.velocity=this.registerDataInput("velocity",mt)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function sm(){if(r)return;r=!0,o("FlowGraphSetAngularVelocityBlock",rm)}sm();
export{rm,sm};

//# debugId=ECBE5B2AFA0520A764756E2164756E21
//# sourceMappingURL=site-j8rd35yj.js.map
