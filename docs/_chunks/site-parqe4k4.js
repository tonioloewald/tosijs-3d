import{tt}from"./site-yk445q08.js";import{We,jt}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class C_ extends tt{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new We(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",jt),this.executionCount=this.registerDataOutput("executionCount",jt,new We(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new We(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function E_(){if(r)return;r=!0,o("FlowGraphDoNBlock",C_)}E_();
export{C_,E_};

//# debugId=C4ADD14C5E1E26F964756E2164756E21
//# sourceMappingURL=site-parqe4k4.js.map
