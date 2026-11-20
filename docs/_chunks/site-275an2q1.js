import{it}from"./site-x0v5x8t1.js";import{w,mt}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class sm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.force=this.registerDataInput("force",mt),this.location=this.registerDataInput("location",mt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function nm(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",sm)}nm();
export{sm,nm};

//# debugId=2B451E73016C789464756E2164756E21
//# sourceMappingURL=site-275an2q1.js.map
