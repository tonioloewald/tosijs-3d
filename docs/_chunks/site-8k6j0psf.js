import{it}from"./site-3hzw4f8j.js";import{V}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class bx extends it{constructor(e){super(e);this.count=this.registerDataInput("count",V),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",V)}_execute(e,u){if(u===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let i=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=i)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function vx(){if(r)return;r=!0,o("FlowGraphDebounceBlock",bx)}vx();
export{bx,vx};

//# debugId=2F8DA4151AD413A764756E2164756E21
//# sourceMappingURL=site-8k6j0psf.js.map
