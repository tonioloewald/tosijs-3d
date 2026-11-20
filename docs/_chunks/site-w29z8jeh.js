import{$e}from"./site-x0v5x8t1.js";import{w,ct}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Ag extends $e{constructor(t){super(t);this.condition=this.registerDataInput("condition",ct),this.onTrue=this.registerDataInput("onTrue",w),this.onFalse=this.registerDataInput("onFalse",w),this.output=this.registerDataOutput("output",w)}_updateOutputs(t){let i=this.condition.getValue(t);this.output.setValue(i?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var e=!1;function Eg(){if(e)return;e=!0,o("FlowGraphConditionalBlock",Ag)}Eg();
export{Ag,Eg};

//# debugId=924D9315475171CE64756E2164756E21
//# sourceMappingURL=site-w29z8jeh.js.map
