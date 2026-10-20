import{tt}from"./site-4r99kqsd.js";import{P,mt}from"./site-ec8w6gnd.js";import{o}from"./site-jv2cv0ev.js";class Wp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",P),this.impulse=this.registerDataInput("impulse",mt),this.location=this.registerDataInput("location",mt)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),r=this.location.getValue(t);e.applyImpulse(s,r),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function Hp(){if(i)return;i=!0,o("FlowGraphApplyImpulseBlock",Wp)}Hp();
export{Wp,Hp};

//# debugId=B92C641312F00C5C64756E2164756E21
//# sourceMappingURL=site-dsyf44a9.js.map
