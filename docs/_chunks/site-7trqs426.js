import{Ye}from"./site-23z3qe8v.js";import{I}from"./site-xp6e2pbe.js";class mS extends Ye{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",I),this.value=this.registerDataInput("value",I),this.result=this.registerDataOutput("result",I)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{mS};

//# debugId=C1E891EF756921CB64756E2164756E21
//# sourceMappingURL=site-7trqs426.js.map
