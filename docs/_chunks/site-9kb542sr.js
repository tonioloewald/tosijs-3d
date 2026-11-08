import{gr}from"./site-2z9zdtr9.js";import{ct}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class Lg extends gr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ct)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function Ng(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",Lg)}Ng();
export{Lg,Ng};

//# debugId=EF4D15659523308964756E2164756E21
//# sourceMappingURL=site-9kb542sr.js.map
