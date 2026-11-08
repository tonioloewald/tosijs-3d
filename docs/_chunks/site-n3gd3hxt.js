import{$e}from"./site-2z9zdtr9.js";import{w}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class Lm extends $e{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",w,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Nm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Lm)}Nm();
export{Lm,Nm};

//# debugId=0DEB56ADE01EF1F764756E2164756E21
//# sourceMappingURL=site-n3gd3hxt.js.map
