import{it}from"./site-3t3g319r.js";import{Ye,qt}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class Fg extends it{constructor(t={}){super(t);this.config=t,this.config.startIndex=t.startIndex??new Ye(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",qt),this.executionCount=this.registerDataOutput("executionCount",qt,new Ye(0))}_execute(t,i){if(i===this.reset)this.executionCount.setValue(this.config.startIndex,t);else{let e=this.executionCount.getValue(t);if(e.value<this.maxExecutions.getValue(t).value)this.executionCount.setValue(new Ye(e.value+1),t),this.out._activateSignal(t)}}getClassName(){return"FlowGraphDoNBlock"}}var r=!1;function kg(){if(r)return;r=!0,o("FlowGraphDoNBlock",Fg)}kg();
export{Fg,kg};

//# debugId=91B60E8D9AB533F064756E2164756E21
//# sourceMappingURL=site-bnnz8xs0.js.map
