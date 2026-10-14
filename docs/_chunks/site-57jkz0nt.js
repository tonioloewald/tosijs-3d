import{Ye}from"./site-y503zpga.js";import{P}from"./site-davp9rnk.js";import{o}from"./site-rj733z8c.js";class Am extends Ye{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",P,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Rm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Am)}Rm();
export{Am,Rm};

//# debugId=7BF093E81C051DB764756E2164756E21
//# sourceMappingURL=site-57jkz0nt.js.map
