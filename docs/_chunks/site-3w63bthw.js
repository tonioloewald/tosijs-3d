import{Ye}from"./site-5tw2831p.js";import{I}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class __ extends Ye{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",I,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var i=!1;function g_(){if(i)return;i=!0,a("FlowGraphGetVariableBlock",__)}g_();
export{__,g_};

//# debugId=5035272C569019EA64756E2164756E21
//# sourceMappingURL=site-3w63bthw.js.map
