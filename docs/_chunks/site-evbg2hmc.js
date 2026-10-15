import{Ye}from"./site-rhk48zyv.js";import{P}from"./site-nw2yz728.js";class hS extends Ye{constructor(t){super(t);this.config=t,this.executionFunction=this.registerDataInput("function",P),this.value=this.registerDataInput("value",P),this.result=this.registerDataOutput("result",P)}_updateOutputs(t){let e=this.executionFunction.getValue(t),u=this.value.getValue(t);if(e)this.result.setValue(e(u,t),t)}getClassName(){return"FlowGraphCodeExecutionBlock"}}
export{hS};

//# debugId=050A1FAB683259D464756E2164756E21
//# sourceMappingURL=site-evbg2hmc.js.map
