import{Ut as A}from"./site-2z5azex9.js";import{eu as d,xu as q}from"./site-5mc4escc.js";import{sE as z}from"./site-tvqrtn5a.js";class H extends A{constructor(b={}){super(b);this.config=b,this.config.startIndex=b.startIndex??new d(0),this.reset=this._registerSignalInput("reset"),this.maxExecutions=this.registerDataInput("maxExecutions",q),this.executionCount=this.registerDataOutput("executionCount",q,new d(0))}_execute(b,J){if(J===this.reset)this.executionCount.setValue(this.config.startIndex,b);else{let v=this.executionCount.getValue(b);if(v.value<this.maxExecutions.getValue(b).value)this.executionCount.setValue(new d(v.value+1),b),this.out._activateSignal(b)}}getClassName(){return"FlowGraphDoNBlock"}}var y=!1;function I(){if(y)return;y=!0,z("FlowGraphDoNBlock",H)}I();
export{H as _o,I as $o};

//# debugId=D7C0407E70CC069064756E2164756E21
//# sourceMappingURL=site-cazqpf80.js.map
