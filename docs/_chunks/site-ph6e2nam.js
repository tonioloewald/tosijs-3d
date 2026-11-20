import{$e}from"./site-x0v5x8t1.js";import{w}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Gm extends $e{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",w,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Um(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",Gm)}Um();
export{Gm,Um};

//# debugId=118A7C299D38846164756E2164756E21
//# sourceMappingURL=site-ph6e2nam.js.map
