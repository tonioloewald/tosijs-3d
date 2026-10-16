import{tt}from"./site-e0k6q2az.js";import{P,pt}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class mm extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.force=this.registerDataInput("force",pt),this.location=this.registerDataInput("location",pt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function _m(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",mm)}_m();
export{mm,_m};

//# debugId=780A55E063FCF6E864756E2164756E21
//# sourceMappingURL=site-9t2xzark.js.map
