import{Ye}from"./site-5tw2831p.js";import{I}from"./site-a5xw8xz8.js";class cS extends Ye{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",I),this.value=this.registerDataInput("value",I),this.result=this.registerDataOutput("result",I)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{cS};

//# debugId=24E509DF51BAE1D764756E2164756E21
//# sourceMappingURL=site-jx844vw4.js.map
