import{tt}from"./site-yk445q08.js";import{k}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class gx extends tt{constructor(e){super(e);this.count=this.registerDataInput("count",k),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",k)}_execute(e,u){if(u===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let i=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=i)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function xx(){if(r)return;r=!0,o("FlowGraphDebounceBlock",gx)}xx();
export{gx,xx};

//# debugId=5CF0B7B803E273F264756E2164756E21
//# sourceMappingURL=site-8jp31e0f.js.map
