import{Vs as s}from"./site-gda1mzz6.js";import{lt as o,qt as l}from"./site-rrva3mwb.js";import{hG as i}from"./site-qd0cy957.js";class a extends s{constructor(t){super(t);this.body=this.registerDataInput("body",o),this.velocity=this.registerDataInput("velocity",l)}_execute(t,p){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setAngularVelocity(this.velocity.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var r=!1;function c(){if(r)return;r=!0,i("FlowGraphSetAngularVelocityBlock",a)}c();
export{a as nn,c as on};

//# debugId=DDAEF595C73E9B7764756E2164756E21
//# sourceMappingURL=site-5tebj6ct.js.map
