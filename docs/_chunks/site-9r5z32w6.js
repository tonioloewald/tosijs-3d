import{Qi}from"./site-z8mqhr1b.js";import{nt}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class am extends Qi{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",nt)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function om(){if(i)return;i=!0,a("FlowGraphFlipFlopBlock",am)}om();
export{am,om};

//# debugId=F5C6EAEC40DB93AC64756E2164756E21
//# sourceMappingURL=site-9r5z32w6.js.map
