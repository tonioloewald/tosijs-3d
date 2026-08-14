import{Ut as D}from"./site-40a1yrg8.js";import{ku as C,pu as j}from"./site-v2rprchq.js";import{sE as z}from"./site-c9kedmgh.js";class H extends D{constructor(b){super(b);this.body=this.registerDataInput("body",C),this.impulse=this.registerDataInput("impulse",j),this.location=this.registerDataInput("location",j)}_execute(b,M){let q=this.body.getValue(b);if(!q){this._reportError(b,"No physics body provided"),this.out._activateSignal(b);return}let K=this.impulse.getValue(b),L=this.location.getValue(b);q.applyImpulse(K,L),this.out._activateSignal(b)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var v=!1;function J(){if(v)return;v=!0,z("FlowGraphApplyImpulseBlock",H)}J();
export{H as Zm,J as _m};

//# debugId=08C4A6FC7BF63B5064756E2164756E21
//# sourceMappingURL=site-9t8hxsa5.js.map
