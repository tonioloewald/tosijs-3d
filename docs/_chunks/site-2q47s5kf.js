import{Qe}from"./site-z8mqhr1b.js";import{B}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Xm extends Qe{constructor(t){super(t);this.count=this.registerDataOutput("count",B),this.reset=this._registerSignalInput("reset")}_execute(t,o){if(o===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function Ym(){if(r)return;r=!0,a("FlowGraphCallCounterBlock",Xm)}Ym();
export{Xm,Ym};

//# debugId=64F4E8F5081E596264756E2164756E21
//# sourceMappingURL=site-2q47s5kf.js.map
