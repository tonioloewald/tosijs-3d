import{tt}from"./site-e0k6q2az.js";import{P,pt}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class Wp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.impulse=this.registerDataInput("impulse",pt),this.location=this.registerDataInput("location",pt)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),r=this.location.getValue(t);e.applyImpulse(s,r),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function Hp(){if(i)return;i=!0,o("FlowGraphApplyImpulseBlock",Wp)}Hp();
export{Wp,Hp};

//# debugId=1FBC77CBEC3BF4F664756E2164756E21
//# sourceMappingURL=site-fy4a24jz.js.map
