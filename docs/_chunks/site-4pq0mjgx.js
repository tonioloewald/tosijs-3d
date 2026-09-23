import{Vs as u}from"./site-gda1mzz6.js";import{ft as e,yt as r}from"./site-rrva3mwb.js";import{hG as s}from"./site-qd0cy957.js";class a extends u{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new e(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",r),this.executionCount=this.registerDataOutput("executionCount",r,new e(0))}_execute(t,l){if(l===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let i=this.executionCount.getValue(t);if(i.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new e(i.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var o=!1;function n(){if(o)return;o=!0,s("FlowGraphDoNBlock",a)}n();
export{a as mp,n as np};

//# debugId=47D093C244A8D86164756E2164756E21
//# sourceMappingURL=site-4pq0mjgx.js.map
