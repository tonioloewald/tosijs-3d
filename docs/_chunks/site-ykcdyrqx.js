import{gr}from"./site-x0v5x8t1.js";import{ct}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Gg extends gr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ct)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function Ug(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",Gg)}Ug();
export{Gg,Ug};

//# debugId=A640BFCACFDB8D6864756E2164756E21
//# sourceMappingURL=site-ykcdyrqx.js.map
