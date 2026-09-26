import{tt}from"./site-5tw2831p.js";import{k}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class ng extends tt{constructor(t){super(t);this.count=this.registerDataOutput("count",k),this.reset=this._registerSignalInput("reset")}_execute(t,o){if(o===this.reset){t._setExecutionVariable(this,"count",0),this.count.setValue(0,t);return}let e=t._getExecutionVariable(this,"count",0)+1;t._setExecutionVariable(this,"count",e),this.count.setValue(e,t),this.out._activateSignal(t)}getClassName(){return"FlowGraphCallCounterBlock"}}var r=!1;function ag(){if(r)return;r=!0,a("FlowGraphCallCounterBlock",ng)}ag();
export{ng,ag};

//# debugId=BF88888257887ED664756E2164756E21
//# sourceMappingURL=site-9z8039gp.js.map
