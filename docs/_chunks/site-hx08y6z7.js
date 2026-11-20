import{it}from"./site-x0v5x8t1.js";import{w,mt}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class lm extends it{constructor(e){super(e);this.body=this.registerDataInput("body",w),this.velocity=this.registerDataInput("velocity",mt)}_execute(e,r){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function cm(){if(i)return;i=!0,o("FlowGraphSetLinearVelocityBlock",lm)}cm();
export{lm,cm};

//# debugId=AF66AF8F7011203564756E2164756E21
//# sourceMappingURL=site-hx08y6z7.js.map
