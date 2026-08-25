import{Ut as s}from"./site-ktyw28d4.js";import{mu as i}from"./site-86tpqddf.js";import{sE as o}from"./site-yf4sr5jd.js";class u extends s{constructor(t){super(t);this.count=this.registerDataOutput("count",i),this.reset=this._registerSignalInput("reset")}_execute(t,l){if(l===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function a(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",u)}a();
export{u as qr,a as rr};

//# debugId=07BB6603569CB61464756E2164756E21
//# sourceMappingURL=site-57qk9eek.js.map
