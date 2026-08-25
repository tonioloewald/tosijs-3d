import{Xt as a}from"./site-fss7f8pw.js";import{nu as o}from"./site-86tpqddf.js";import{sE as l}from"./site-yf4sr5jd.js";class r extends a{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",o)}_execute(e,p){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function s(){if(i)return;i=!0,l("FlowGraphFlipFlopBlock",r)}s();
export{r as ap,s as bp};

//# debugId=20EDA055B8F5148264756E2164756E21
//# sourceMappingURL=site-fmw3jtwd.js.map
