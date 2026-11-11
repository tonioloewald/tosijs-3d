import{it}from"./site-j6ranrbs.js";import{w,mt}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class Am extends it{constructor(t){super(t);this.body=this.registerDataInput("body",w),this.force=this.registerDataInput("force",mt),this.location=this.registerDataInput("location",mt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function Em(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",Am)}Em();
export{Am,Em};

//# debugId=4BB39A2627EA5C6E64756E2164756E21
//# sourceMappingURL=site-45f94dbg.js.map
