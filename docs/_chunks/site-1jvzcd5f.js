import{it}from"./site-ktydmw50.js";import{O,mt}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Cm extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.force=this.registerDataInput("force",mt),this.location=this.registerDataInput("location",mt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function Am(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",Cm)}Am();
export{Cm,Am};

//# debugId=F97301AA2A44ADC164756E2164756E21
//# sourceMappingURL=site-1jvzcd5f.js.map
