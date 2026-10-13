import{Ye}from"./site-4jsq7n1s.js";import{P}from"./site-9sh5dtm0.js";class mS extends Ye{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",P),this.value=this.registerDataInput("value",P),this.result=this.registerDataOutput("result",P)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{mS};

//# debugId=B012F71319FA369A64756E2164756E21
//# sourceMappingURL=site-3ajwbfxb.js.map
