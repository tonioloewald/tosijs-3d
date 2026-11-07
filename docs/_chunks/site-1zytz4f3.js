import{it}from"./site-ktydmw50.js";import{O,mt}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Kp extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.impulse=this.registerDataInput("impulse",mt),this.location=this.registerDataInput("location",mt)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),r=this.location.getValue(t);e.applyImpulse(s,r),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function Jp(){if(i)return;i=!0,o("FlowGraphApplyImpulseBlock",Kp)}Jp();
export{Kp,Jp};

//# debugId=9AFC222000FBD80364756E2164756E21
//# sourceMappingURL=site-1zytz4f3.js.map
