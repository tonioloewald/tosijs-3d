import{$e}from"./site-j6ranrbs.js";import{w}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class Lm extends $e{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",w,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Nm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Lm)}Nm();
export{Lm,Nm};

//# debugId=0DEB56ADE01EF1F764756E2164756E21
//# sourceMappingURL=site-v0jgxfk9.js.map
