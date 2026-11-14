import{gr}from"./site-3t3g319r.js";import{ct}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class Vg extends gr{constructor(e){super(e);this.onOn=this._registerSignalOutput("onOn"),this.onOff=this._registerSignalOutput("onOff"),this.value=this.registerDataOutput("value",ct)}_execute(e,l){let t=e._getExecutionVariable(this,"value",typeof this.config?.startValue==="boolean"?!this.config.startValue:!1);if(t=!t,e._setExecutionVariable(this,"value",t),this.value.setValue(t,e),t)this.onOn._activateSignal(e);else this.onOff._activateSignal(e)}getClassName(){return"FlowGraphFlipFlopBlock"}}var i=!1;function zg(){if(i)return;i=!0,o("FlowGraphFlipFlopBlock",Vg)}zg();
export{Vg,zg};

//# debugId=4CE9ACA6CEE8084564756E2164756E21
//# sourceMappingURL=site-6j3qmzyv.js.map
