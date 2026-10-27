import{it}from"./site-v7dfb6ky.js";import{He,Qt}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";class yg extends it{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new He(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",Qt),this.executionCount=this.registerDataOutput("executionCount",Qt,new He(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new He(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function Tg(){if(r)return;r=!0,o("FlowGraphDoNBlock",yg)}Tg();
export{yg,Tg};

//# debugId=0B929D2BF3763D9164756E2164756E21
//# sourceMappingURL=site-4rwfzek2.js.map
