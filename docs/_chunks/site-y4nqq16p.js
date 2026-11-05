import{it}from"./site-sxxg2v6h.js";import{V}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class Sx extends it{constructor(e){super(e);this.count=this.registerDataInput("count",V),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",V)}_execute(e,u){if(u===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let i=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=i)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function yx(){if(r)return;r=!0,o("FlowGraphDebounceBlock",Sx)}yx();
export{Sx,yx};

//# debugId=3159C5383822A53A64756E2164756E21
//# sourceMappingURL=site-y4nqq16p.js.map
