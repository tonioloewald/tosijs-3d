import{tt}from"./site-y503zpga.js";import{We,Qt}from"./site-davp9rnk.js";import{o}from"./site-rj733z8c.js";class C_ extends tt{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new We(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",Qt),this.executionCount=this.registerDataOutput("executionCount",Qt,new We(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new We(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function E_(){if(r)return;r=!0,o("FlowGraphDoNBlock",C_)}E_();
export{C_,E_};

//# debugId=A9AECF3F3DCFFC5264756E2164756E21
//# sourceMappingURL=site-caan0xw4.js.map
