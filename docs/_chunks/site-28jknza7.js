import{Ut as u}from"./site-ktyw28d4.js";import{eu as e,xu as r}from"./site-86tpqddf.js";import{sE as s}from"./site-yf4sr5jd.js";class a extends u{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new e(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",r),this.executionCount=this.registerDataOutput("executionCount",r,new e(0))}_execute(t,l){if(l===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let i=this.executionCount.getValue(t);if(i.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new e(i.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var o=!1;function n(){if(o)return;o=!0,s("FlowGraphDoNBlock",a)}n();
export{a as _o,n as $o};

//# debugId=87ACF501ABDAC6F664756E2164756E21
//# sourceMappingURL=site-28jknza7.js.map
