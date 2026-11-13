import{it}from"./site-qyhmxwr1.js";import{Ye,Qt}from"./site-67r40dmn.js";import{o}from"./site-ars0s908.js";class Fg extends it{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new Ye(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",Qt),this.executionCount=this.registerDataOutput("executionCount",Qt,new Ye(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new Ye(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function kg(){if(r)return;r=!0,o("FlowGraphDoNBlock",Fg)}kg();
export{Fg,kg};

//# debugId=9C429604FA9111E064756E2164756E21
//# sourceMappingURL=site-shs9v18e.js.map
