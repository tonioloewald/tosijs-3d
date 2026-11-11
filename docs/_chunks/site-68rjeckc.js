import{$e}from"./site-j6ranrbs.js";import{w}from"./site-g82qva8f.js";class y0 extends $e{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",w),this.value=this.registerDataInput("value",w),this.result=this.registerDataOutput("result",w)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{y0};

//# debugId=F579C3777A6EFAA764756E2164756E21
//# sourceMappingURL=site-68rjeckc.js.map
