import{Ye}from"./site-yk445q08.js";import{I}from"./site-yrysffz4.js";class mS extends Ye{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",I),this.value=this.registerDataInput("value",I),this.result=this.registerDataOutput("result",I)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{mS};

//# debugId=C1E891EF756921CB64756E2164756E21
//# sourceMappingURL=site-ef5zsdtv.js.map
