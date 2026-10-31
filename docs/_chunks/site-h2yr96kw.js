import{Xe}from"./site-3hzw4f8j.js";import{O}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Im extends Xe{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",O,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Om(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Im)}Om();
export{Im,Om};

//# debugId=0DE1A74278CF9CBD64756E2164756E21
//# sourceMappingURL=site-h2yr96kw.js.map
