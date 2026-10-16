import{tt}from"./site-e0k6q2az.js";import{He,Qt}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class y_ extends tt{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new He(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",Qt),this.executionCount=this.registerDataOutput("executionCount",Qt,new He(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new He(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function T_(){if(r)return;r=!0,o("FlowGraphDoNBlock",y_)}T_();
export{y_,T_};

//# debugId=B268B26687E4B01E64756E2164756E21
//# sourceMappingURL=site-a1cg086m.js.map
