import{it}from"./site-x0v5x8t1.js";import{V}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Ng extends it{constructor(e){super(e);this.count=this.registerDataInput("count",V),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",V)}_execute(e,u){if(u===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let i=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=i)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function Bg(){if(r)return;r=!0,o("FlowGraphDebounceBlock",Ng)}Bg();
export{Ng,Bg};

//# debugId=7D20F7C1F8A5881364756E2164756E21
//# sourceMappingURL=site-vemkkyxp.js.map
