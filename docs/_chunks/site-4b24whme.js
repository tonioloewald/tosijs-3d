import{it}from"./site-tabsjb83.js";import{Ye,Qt}from"./site-mb4g134k.js";import{o}from"./site-3k900c4f.js";class Ig extends it{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new Ye(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",Qt),this.executionCount=this.registerDataOutput("executionCount",Qt,new Ye(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new Ye(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function Og(){if(r)return;r=!0,o("FlowGraphDoNBlock",Ig)}Og();
export{Ig,Og};

//# debugId=681DCA71406BAC1C64756E2164756E21
//# sourceMappingURL=site-4b24whme.js.map
