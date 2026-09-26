import{tt}from"./site-5tw2831p.js";import{He,$t}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class x_ extends tt{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new He(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",$t),this.executionCount=this.registerDataOutput("executionCount",$t,new He(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new He(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function v_(){if(r)return;r=!0,a("FlowGraphDoNBlock",x_)}v_();
export{x_,v_};

//# debugId=E2CAB5AB8D7C889B64756E2164756E21
//# sourceMappingURL=site-jh33pm6f.js.map
