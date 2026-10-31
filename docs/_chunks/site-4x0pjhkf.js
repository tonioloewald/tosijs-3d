import{Xe}from"./site-3hzw4f8j.js";import{O}from"./site-ge04ms28.js";class xS extends Xe{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",O),this.value=this.registerDataInput("value",O),this.result=this.registerDataOutput("result",O)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{xS};

//# debugId=0F942FC2FDC8A27A64756E2164756E21
//# sourceMappingURL=site-4x0pjhkf.js.map
