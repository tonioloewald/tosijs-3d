import{Ts as u}from"./site-nv8skz8z.js";import{dt as e,wt as r}from"./site-bab0thfc.js";import{fG as s}from"./site-pcap36fe.js";class a extends u{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new e(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",r),this.executionCount=this.registerDataOutput("executionCount",r,new e(0))}_execute(t,l){if(l===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let i=this.executionCount.getValue(t);if(i.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new e(i.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var o=!1;function n(){if(o)return;o=!0,s("FlowGraphDoNBlock",a)}n();
export{a as kp,n as lp};

//# debugId=7E021A3F37C4822C64756E2164756E21
//# sourceMappingURL=site-znc59zcc.js.map
