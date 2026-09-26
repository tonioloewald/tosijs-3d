import{tt}from"./site-5tw2831p.js";import{k}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class og extends tt{constructor(e){super(e);this.count=this.registerDataInput("count",k),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",k)}_execute(e,o){if(o===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let u=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=u)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function lg(){if(r)return;r=!0,a("FlowGraphDebounceBlock",og)}lg();
export{og,lg};

//# debugId=1256B27D4878A22464756E2164756E21
//# sourceMappingURL=site-qwk99wdm.js.map
