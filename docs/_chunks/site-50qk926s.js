import{it}from"./site-v7dfb6ky.js";import{P,mt}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class mm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.force=this.registerDataInput("force",mt),this.location=this.registerDataInput("location",mt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function gm(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",mm)}gm();
export{mm,gm};

//# debugId=C562BCC528BA817E64756E2164756E21
//# sourceMappingURL=site-50qk926s.js.map
