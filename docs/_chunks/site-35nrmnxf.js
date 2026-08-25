import{Ut as i}from"./site-ktyw28d4.js";import{mu as r}from"./site-86tpqddf.js";import{sE as u}from"./site-yf4sr5jd.js";class n extends i{constructor(e){super(e);this.count=this.registerDataInput("count",r),this.reset=this._registerSignalInput("reset"),this.currentCount=this.registerDataOutput("currentCount",r)}_execute(e,c){if(c===this.reset){e._setExecutionVariable(this,"debounceCount",0);return}let a=this.count.getValue(e),t=e._getExecutionVariable(this,"debounceCount",0)+1;if(this.currentCount.setValue(t,e),e._setExecutionVariable(this,"debounceCount",t),t>=a)this.out._activateSignal(e),e._setExecutionVariable(this,"debounceCount",0)}getClassName(){return"FlowGraphDebounceBlock"}}var o=!1;function s(){if(o)return;o=!0,u("FlowGraphDebounceBlock",n)}s();
export{n as sr,s as tr};

//# debugId=14FB80B5ABD58C3764756E2164756E21
//# sourceMappingURL=site-35nrmnxf.js.map
