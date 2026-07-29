import{Ut as A}from"./site-2z5azex9.js";import{ku as v,pu as z}from"./site-5mc4escc.js";import{sE as q}from"./site-tvqrtn5a.js";class C extends A{constructor(b){super(b);this.body=this.registerDataInput("body",v),this.velocity=this.registerDataInput("velocity",z)}_execute(b,H){let j=this.body.getValue(b);if(!j){this._reportError(b,"No physics body provided"),this.out._activateSignal(b);return}j.setLinearVelocity(this.velocity.getValue(b)),this.out._activateSignal(b)}getClassName(){return"FlowGraphSetLinearVelocityBlock"}}var m=!1;function D(){if(m)return;m=!0,q("FlowGraphSetLinearVelocityBlock",C)}D();
export{C as $m,D as an};

//# debugId=8192AD2BD74907FB64756E2164756E21
//# sourceMappingURL=site-ns52c315.js.map
