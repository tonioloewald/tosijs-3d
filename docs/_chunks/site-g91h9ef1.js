import{it}from"./site-v7dfb6ky.js";import{V}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class fx extends it{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function px(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",fx)}px();
export{fx,px};

//# debugId=4048C5413BD50C5364756E2164756E21
//# sourceMappingURL=site-g91h9ef1.js.map
