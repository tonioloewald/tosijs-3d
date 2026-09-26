import{Qe}from"./site-z8mqhr1b.js";import{B}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class jm extends Qe{constructor(e){super(e);this.count=this.registerDataInput("count",B),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",B)}_execute(e,o){if(o===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let u=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=u)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function $m(){if(r)return;r=!0,a("FlowGraphDebounceBlock",jm)}$m();
export{jm,$m};

//# debugId=A5C92C009D3A403164756E2164756E21
//# sourceMappingURL=site-vk9mr9bd.js.map
