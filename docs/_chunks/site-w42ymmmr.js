import{it}from"./site-2z9zdtr9.js";import{V}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class Tx extends it{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function Cx(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",Tx)}Cx();
export{Tx,Cx};

//# debugId=3FA9B9D344CCD3D664756E2164756E21
//# sourceMappingURL=site-w42ymmmr.js.map
