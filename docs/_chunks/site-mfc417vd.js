import{it}from"./site-2z9zdtr9.js";import{Ye,Qt}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class Mg extends it{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new Ye(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",Qt),this.executionCount=this.registerDataOutput("executionCount",Qt,new Ye(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new Ye(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function Dg(){if(r)return;r=!0,o("FlowGraphDoNBlock",Mg)}Dg();
export{Mg,Dg};

//# debugId=E108C0C26D97017D64756E2164756E21
//# sourceMappingURL=site-mfc417vd.js.map
