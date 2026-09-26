import{Qe}from"./site-z8mqhr1b.js";import{R,ct}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Zd extends Qe{constructor(t){super(t);this.body=this.registerDataInput("body",R),this.impulse=this.registerDataInput("impulse",ct),this.location=this.registerDataInput("location",ct)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),o=this.location.getValue(t);e.applyImpulse(s,o),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function Jd(){if(i)return;i=!0,a("FlowGraphApplyImpulseBlock",Zd)}Jd();
export{Zd,Jd};

//# debugId=CDD573F0B254075764756E2164756E21
//# sourceMappingURL=site-sfxqr5wk.js.map
