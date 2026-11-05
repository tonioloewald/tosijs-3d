import{$e}from"./site-sxxg2v6h.js";import{O}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class wm extends $e{constructor(e){super(e);this.config=e,this.value=this.registerDataOutput("value",O,e.initialValue)}_updateOutputs(e){let r=this.config.variable;if(e.hasVariable(r))this.value.setValue(e.getVariable(r),e)}serialize(e){super.serialize(e),e.config.variable=this.config.variable}getClassName(){return"FlowGraphGetVariableBlock"}}var a=!1;function Pm(){if(a)return;a=!0,o("FlowGraphGetVariableBlock",wm)}Pm();
export{wm,Pm};

//# debugId=496845B17779F01164756E2164756E21
//# sourceMappingURL=site-cwvzj64s.js.map
