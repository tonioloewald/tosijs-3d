import{Ut as H}from"./site-2z5azex9.js";import{mu as v}from"./site-5mc4escc.js";import{sE as A}from"./site-tvqrtn5a.js";class I extends H{constructor(d){super(d);this.count=this.registerDataInput("count",v),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",v)}_execute(d,K){if(K===this.reset){d._setExecutionVariable(this,"debounceCount",0);return}let L=this.count.getValue(d),q=d._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(q,d),d._setExecutionVariable(this,"debounceCount",q),q>=L)this.out._activateSignal(d),d._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var z=!1;function J(){if(z)return;z=!0,A("FlowGraphDebounceBlock",I)}J();
export{I as sr,J as tr};

//# debugId=13EA2618BE99EE7464756E2164756E21
//# sourceMappingURL=site-0aq24anj.js.map
