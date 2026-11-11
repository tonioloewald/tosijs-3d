import{it}from"./site-j6ranrbs.js";import{V}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class Ax extends it{constructor(e){super(e);this.count=this.registerDataInput("count",V),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",V)}_execute(e,u){if(u===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let i=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=i)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function Ex(){if(r)return;r=!0,o("FlowGraphDebounceBlock",Ax)}Ex();
export{Ax,Ex};

//# debugId=010EF7ACC8C2D53B64756E2164756E21
//# sourceMappingURL=site-ne849afh.js.map
