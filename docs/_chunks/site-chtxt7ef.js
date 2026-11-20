import{$e}from"./site-x0v5x8t1.js";import{w}from"./site-5stwdw2k.js";class A0 extends $e{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",w),this.value=this.registerDataInput("value",w),this.result=this.registerDataOutput("result",w)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{A0};

//# debugId=0C24D50A4EA002F164756E2164756E21
//# sourceMappingURL=site-chtxt7ef.js.map
