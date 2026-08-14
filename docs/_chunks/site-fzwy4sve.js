import{Ut as A}from"./site-40a1yrg8.js";import{ku as v,pu as z}from"./site-v2rprchq.js";import{sE as q}from"./site-c9kedmgh.js";class C extends A{constructor(b){super(b);this.body=this.registerDataInput("body",v),this.velocity=this.registerDataInput("velocity",z)}_execute(b,H){let j=this.body.getValue(b);if(!j){this._reportError(b,"No physics body provided"),this.out._activateSignal(b);return}j.setLinearVelocity(this.velocity.getValue(b)),this.out._activateSignal(b)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var m=!1;function D(){if(m)return;m=!0,q("FlowGraphSetLinearVelocityBlock",C)}D();
export{C as $m,D as an};

//# debugId=0D5F687E8F2FD8AA64756E2164756E21
//# sourceMappingURL=site-fzwy4sve.js.map
