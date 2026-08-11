import{Ut as C}from"./site-2z5azex9.js";import{ku as z,pu as j}from"./site-5mc4escc.js";import{sE as v}from"./site-tvqrtn5a.js";class D extends C{constructor(b){super(b);this.body=this.registerDataInput("body",z),this.force=this.registerDataInput("force",j),this.location=this.registerDataInput("location",j)}_execute(b,K){let m=this.body.getValue(b);if(!m){this._reportError(b,"No physics body provided"),this.out._activateSignal(b);return}let I=this.force.getValue(b),J=this.location.getValue(b);m.applyForce(I,J),this.out._activateSignal(b)}getClassName(){return"FlowGraphApplyForceBlock"}}var q=!1;function H(){if(q)return;q=!0,v("FlowGraphApplyForceBlock",D)}H();
export{D as yn,H as zn};

//# debugId=3AEE2D86E578C82B64756E2164756E21
//# sourceMappingURL=site-9d33mrr5.js.map
