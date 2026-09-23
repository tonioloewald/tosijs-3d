import{Vs as i}from"./site-gda1mzz6.js";import{nt as r}from"./site-rrva3mwb.js";import{hG as u}from"./site-qd0cy957.js";class n extends i{constructor(e){super(e);this.count=this.registerDataInput("count",r),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",r)}_execute(e,c){if(c===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let a=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=a)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var o=!1;function s(){if(o)return;o=!0,u("FlowGraphDebounceBlock",n)}s();
export{n as ip,s as jp};

//# debugId=8F13D7630B585EEF64756E2164756E21
//# sourceMappingURL=site-t2nra8bh.js.map
