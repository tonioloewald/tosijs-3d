import{tt}from"./site-rhk48zyv.js";import{P,pt}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class mm extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.force=this.registerDataInput("force",pt),this.location=this.registerDataInput("location",pt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function _m(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",mm)}_m();
export{mm,_m};

//# debugId=780A55E063FCF6E864756E2164756E21
//# sourceMappingURL=site-hckdzz26.js.map
