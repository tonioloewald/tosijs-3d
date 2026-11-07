import{gr}from"./site-ktydmw50.js";import{ct}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Dg extends gr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ct)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function Lg(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",Dg)}Lg();
export{Dg,Lg};

//# debugId=71FD5DF0B2784B8564756E2164756E21
//# sourceMappingURL=site-rges58a1.js.map
