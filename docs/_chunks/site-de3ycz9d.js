import{it}from"./site-tabsjb83.js";import{V}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class bx extends it{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function vx(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",bx)}vx();
export{bx,vx};

//# debugId=0E46791785A61EA764756E2164756E21
//# sourceMappingURL=site-de3ycz9d.js.map
