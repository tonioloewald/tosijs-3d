import{$e}from"./site-3t3g319r.js";import{w}from"./site-8r8s7x74.js";class T0 extends $e{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",w),this.value=this.registerDataInput("value",w),this.result=this.registerDataOutput("result",w)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{T0};

//# debugId=4B004ACD74FF3A6764756E2164756E21
//# sourceMappingURL=site-63r866xw.js.map
