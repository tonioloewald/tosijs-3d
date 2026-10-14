import{tt}from"./site-kqwawvd6.js";import{V}from"./site-sfk0thcq.js";import{o}from"./site-4j308xxc.js";class gx extends tt{constructor(e){super(e);this.count=this.registerDataInput("count",V),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",V)}_execute(e,u){if(u===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let i=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=i)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function xx(){if(r)return;r=!0,o("FlowGraphDebounceBlock",gx)}xx();
export{gx,xx};

//# debugId=1A440D9ECE81E2D564756E2164756E21
//# sourceMappingURL=site-vnqpz0zw.js.map
