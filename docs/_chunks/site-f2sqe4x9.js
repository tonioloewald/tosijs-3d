import{tt}from"./site-n1qmzpg8.js";import{P,pt}from"./site-p0tgjt0r.js";import{o}from"./site-zg1n9j37.js";class Wp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.impulse=this.registerDataInput("impulse",pt),this.location=this.registerDataInput("location",pt)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),r=this.location.getValue(t);e.applyImpulse(s,r),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function Hp(){if(i)return;i=!0,o("FlowGraphApplyImpulseBlock",Wp)}Hp();
export{Wp,Hp};

//# debugId=1FBC77CBEC3BF4F664756E2164756E21
//# sourceMappingURL=site-f2sqe4x9.js.map
