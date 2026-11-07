import{it}from"./site-ktydmw50.js";import{Ye,Qt}from"./site-rfjvxq2b.js";import{o}from"./site-hcyxrnqg.js";class Pg extends it{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new Ye(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",Qt),this.executionCount=this.registerDataOutput("executionCount",Qt,new Ye(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new Ye(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function Mg(){if(r)return;r=!0,o("FlowGraphDoNBlock",Pg)}Mg();
export{Pg,Mg};

//# debugId=D8795189FDCA9C5964756E2164756E21
//# sourceMappingURL=site-x251s9zr.js.map
