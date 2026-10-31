import{it}from"./site-3hzw4f8j.js";import{He,Qt}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Eg extends it{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new He(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",Qt),this.executionCount=this.registerDataOutput("executionCount",Qt,new He(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new He(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function Rg(){if(r)return;r=!0,o("FlowGraphDoNBlock",Eg)}Rg();
export{Eg,Rg};

//# debugId=528532521C6754A064756E2164756E21
//# sourceMappingURL=site-adznat6d.js.map
