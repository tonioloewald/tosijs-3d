import{tt}from"./site-c6g1b76s.js";import{He,jt}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class x_ extends tt{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new He(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",jt),this.executionCount=this.registerDataOutput("executionCount",jt,new He(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new He(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function v_(){if(r)return;r=!0,a("FlowGraphDoNBlock",x_)}v_();
export{x_,v_};

//# debugId=6F216605EFE0844664756E2164756E21
//# sourceMappingURL=site-m9tnqzsw.js.map
