import{Ye}from"./site-c6g1b76s.js";import{I}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class __ extends Ye{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",I,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var i=!1;function g_(){if(i)return;i=!0,a("FlowGraphGetVariableBlock",__)}g_();
export{__,g_};

//# debugId=5035272C569019EA64756E2164756E21
//# sourceMappingURL=site-h220xypg.js.map
