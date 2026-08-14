import{Ut as H}from"./site-40a1yrg8.js";import{mu as v}from"./site-v2rprchq.js";import{sE as A}from"./site-c9kedmgh.js";class I extends H{constructor(d){super(d);this.count=this.registerDataInput("count",v),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",v)}_execute(d,K){if(K===this.reset){d._setExecutionVariable(this,"debounceCount",0);return}let L=this.count.getValue(d),q=d._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(q,d),d._setExecutionVariable(this,"debounceCount",q),q>=L)this.out._activateSignal(d),d._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var z=!1;function J(){if(z)return;z=!0,A("FlowGraphDebounceBlock",I)}J();
export{I as sr,J as tr};

//# debugId=FC533E298B746CEF64756E2164756E21
//# sourceMappingURL=site-3gwqyae5.js.map
