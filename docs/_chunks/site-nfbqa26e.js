import{Ut as C}from"./site-40a1yrg8.js";import{ku as v,pu as z}from"./site-v2rprchq.js";import{sE as q}from"./site-c9kedmgh.js";class D extends C{constructor(b){super(b);this.body=this.registerDataInput("body",v),this.velocity=this.registerDataInput("velocity",z)}_execute(b,H){let j=this.body.getValue(b);if(!j){this._reportError(b,"No physics body provided"),this.out._activateSignal(b);return}j.setAngularVelocity(this.velocity.getValue(b)),this.out._activateSignal(b)}getClassName(){return"FlowGraphSetAngularVelocityBlock"}}var m=!1;function E(){if(m)return;m=!0,q("FlowGraphSetAngularVelocityBlock",D)}E();
export{D as bn,E as cn};

//# debugId=7D177F004AD1B83464756E2164756E21
//# sourceMappingURL=site-nfbqa26e.js.map
