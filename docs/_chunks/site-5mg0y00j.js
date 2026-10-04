import{Ye}from"./site-yk445q08.js";import{I}from"./site-yrysffz4.js";import{o}from"./site-wcwq97n8.js";class Am extends Ye{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",I,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Rm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Am)}Rm();
export{Am,Rm};

//# debugId=DE8C31FB961AF2E564756E2164756E21
//# sourceMappingURL=site-5mg0y00j.js.map
