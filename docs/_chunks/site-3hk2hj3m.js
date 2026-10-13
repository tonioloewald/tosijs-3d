import{Ye}from"./site-2t6wdrsc.js";import{I}from"./site-sy6g2f03.js";class mS extends Ye{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",I),this.value=this.registerDataInput("value",I),this.result=this.registerDataOutput("result",I)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{mS};

//# debugId=C1E891EF756921CB64756E2164756E21
//# sourceMappingURL=site-3hk2hj3m.js.map
