import{tt}from"./site-23z3qe8v.js";import{I,pt}from"./site-xp6e2pbe.js";import{o}from"./site-6fgvbfwz.js";class Xp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.impulse=this.registerDataInput("impulse",pt),this.location=this.registerDataInput("location",pt)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),r=this.location.getValue(t);e.applyImpulse(s,r),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function Yp(){if(i)return;i=!0,o("FlowGraphApplyImpulseBlock",Xp)}Yp();
export{Xp,Yp};

//# debugId=88577AF99B1CD0D464756E2164756E21
//# sourceMappingURL=site-q3mh8q0n.js.map
