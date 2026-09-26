import{Qe}from"./site-z8mqhr1b.js";import{Ve,Vt}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class sm extends Qe{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new Ve(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",Vt),this.executionCount=this.registerDataOutput("executionCount",Vt,new Ve(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new Ve(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function nm(){if(r)return;r=!0,a("FlowGraphDoNBlock",sm)}nm();
export{sm,nm};

//# debugId=6CA41431FC2AD30464756E2164756E21
//# sourceMappingURL=site-gwf4r341.js.map
