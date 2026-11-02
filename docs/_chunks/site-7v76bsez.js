import{$e}from"./site-scdwvr9t.js";import{O}from"./site-cb9bs1rv.js";class x0 extends $e{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",O),this.value=this.registerDataInput("value",O),this.result=this.registerDataOutput("result",O)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{x0};

//# debugId=2F6AE68D1CA6A29064756E2164756E21
//# sourceMappingURL=site-7v76bsez.js.map
