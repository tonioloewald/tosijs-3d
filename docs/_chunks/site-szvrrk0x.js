import{tt}from"./site-rhk48zyv.js";import{V}from"./site-nw2yz728.js";import{o}from"./site-f3h6cypm.js";class mx extends tt{constructor(e){super(e);this.count=this.registerDataInput("count",V),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",V)}_execute(e,u){if(u===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let i=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=i)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var r=!1;function _x(){if(r)return;r=!0,o("FlowGraphDebounceBlock",mx)}_x();
export{mx,_x};

//# debugId=63F0A16593475D5364756E2164756E21
//# sourceMappingURL=site-szvrrk0x.js.map
