import{Vs as s}from"./site-gda1mzz6.js";import{lt as o,qt as l}from"./site-rrva3mwb.js";import{hG as r}from"./site-qd0cy957.js";class a extends s{constructor(e){super(e);this.body=this.registerDataInput("body",o),this.velocity=this.registerDataInput("velocity",l)}_execute(e,p){let t=this.body.getValue(e);if(!t){this._reportError(e,"No physics body provided"),this.out._activateSignal(e);return}t.setLinearVelocity(this.velocity.getValue(e)),this.out._activateSignal(e)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var i=!1;function c(){if(i)return;i=!0,r("FlowGraphSetLinearVelocityBlock",a)}c();
export{a as ln,c as mn};

//# debugId=465F8600743E550964756E2164756E21
//# sourceMappingURL=site-scttmtva.js.map
