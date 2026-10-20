import{tt}from"./site-4r99kqsd.js";import{V}from"./site-ec8w6gnd.js";import{o}from"./site-jv2cv0ev.js";class fx extends tt{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function px(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",fx)}px();
export{fx,px};

//# debugId=BA12722B877C0C4064756E2164756E21
//# sourceMappingURL=site-19w8e8zc.js.map
