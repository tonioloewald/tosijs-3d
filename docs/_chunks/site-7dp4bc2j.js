import{it}from"./site-ktydmw50.js";import{V}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Cx extends it{constructor(e){super(e);this.count=this.registerDataInput("count",V),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",V)}_execute(e,u){if(u===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let i=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=i)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function Ax(){if(r)return;r=!0,o("FlowGraphDebounceBlock",Cx)}Ax();
export{Cx,Ax};

//# debugId=C171A7E4AD6E58B064756E2164756E21
//# sourceMappingURL=site-7dp4bc2j.js.map
