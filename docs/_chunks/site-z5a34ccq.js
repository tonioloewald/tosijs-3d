import{it}from"./site-3hzw4f8j.js";import{O,mt}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class $p extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.impulse=this.registerDataInput("impulse",mt),this.location=this.registerDataInput("location",mt)}_execute(t,l){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let s=this.impulse.getValue(t),r=this.location.getValue(t);e.applyImpulse(s,r),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyImpulseBlock"}}var i=!1;function jp(){if(i)return;i=!0,o("FlowGraphApplyImpulseBlock",$p)}jp();
export{$p,jp};

//# debugId=81E09F24E046848464756E2164756E21
//# sourceMappingURL=site-z5a34ccq.js.map
