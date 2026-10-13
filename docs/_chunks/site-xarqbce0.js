import{tt}from"./site-23z3qe8v.js";import{I,pt}from"./site-xp6e2pbe.js";import{o}from"./site-6fgvbfwz.js";class gm extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.force=this.registerDataInput("force",pt),this.location=this.registerDataInput("location",pt)}_execute(t,a){let r=this.body.getValue(t);if(!r){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let i=this.force.getValue(t),s=this.location.getValue(t);r.applyForce(i,s),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var e=!1;function xm(){if(e)return;e=!0,o("FlowGraphApplyForceBlock",gm)}xm();
export{gm,xm};

//# debugId=A5B5908640246D8664756E2164756E21
//# sourceMappingURL=site-xarqbce0.js.map
