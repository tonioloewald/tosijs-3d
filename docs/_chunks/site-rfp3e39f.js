import{it}from"./site-ktydmw50.js";import{V}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class yx extends it{constructor(t){super(t);this.count=this.registerDataOutput("count",V),this.reset=this._registerSignalInput("reset")}_execute(t,i){if(i===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function Tx(){if(r)return;r=!0,o("FlowGraphCallCounterBlock",yx)}Tx();
export{yx,Tx};

//# debugId=15069110E9B3098564756E2164756E21
//# sourceMappingURL=site-rfp3e39f.js.map
