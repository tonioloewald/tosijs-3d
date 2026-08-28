import{Ts as i}from"./site-nv8skz8z.js";import{lt as r}from"./site-bab0thfc.js";import{fG as u}from"./site-pcap36fe.js";class n extends i{constructor(e){super(e);this.count=this.registerDataInput("count",r),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",r)}_execute(e,c){if(c===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let a=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=a)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var o=!1;function s(){if(o)return;o=!0,u("FlowGraphDebounceBlock",n)}s();
export{n as gp,s as hp};

//# debugId=A9F3F6A5C95A66A564756E2164756E21
//# sourceMappingURL=site-gndzwz3c.js.map
