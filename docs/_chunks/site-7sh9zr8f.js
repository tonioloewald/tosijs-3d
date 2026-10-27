import{it}from"./site-v7dfb6ky.js";import{V}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class mx extends it{constructor(e){super(e);this.count=this.registerDataInput("count",V),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",V)}_execute(e,u){if(u===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let i=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=i)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function gx(){if(r)return;r=!0,o("FlowGraphDebounceBlock",mx)}gx();
export{mx,gx};

//# debugId=68F495386F86E0E064756E2164756E21
//# sourceMappingURL=site-7sh9zr8f.js.map
