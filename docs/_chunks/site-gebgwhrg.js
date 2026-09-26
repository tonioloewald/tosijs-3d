import{ze}from"./site-z8mqhr1b.js";import{R,nt}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Hp extends ze{constructor(t){super(t);this.condition=this.registerDataInput("condition",nt),this.onTrue=this.registerDataInput("onTrue",R),this.onFalse=this.registerDataInput("onFalse",R),this.output=this.registerDataOutput("output",R)}_updateOutputs(t){let e=this.condition.getValue(t);this.output.setValue(e?this.onTrue.getValue(t):this.onFalse.getValue(t),t)}getClassName(){return"FlowGraphConditionalBlock"}}var o=!1;function Xp(){if(o)return;o=!0,a("FlowGraphConditionalBlock",Hp)}Xp();
export{Hp,Xp};

//# debugId=F7E7CAAE5AC5144B64756E2164756E21
//# sourceMappingURL=site-gebgwhrg.js.map
