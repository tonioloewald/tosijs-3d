import{Xt as D}from"./site-n4wzvw99.js";import{nu as A}from"./site-5mc4escc.js";import{sE as z}from"./site-tvqrtn5a.js";class H extends D{constructor(b){super(b);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",A)}_execute(b,J){let m=b._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(m=!m,b._setExecutionVariable(this,"value",m),this.value.setValue(m,b),m)this.onOn._activateSignal(b);else this.onOff._activateSignal(b)}getClassName(){return"FlowGraphFlipFlopBlock"}}var q=!1;function I(){if(q)return;q=!0,z("FlowGraphFlipFlopBlock",H)}I();
export{H as ap,I as bp};

//# debugId=FDE03670E29AA95A64756E2164756E21
//# sourceMappingURL=site-2jwd347f.js.map
