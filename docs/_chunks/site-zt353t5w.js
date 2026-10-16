import{Ye,ai}from"./site-e0k6q2az.js";import{He,P}from"./site-f1rg9jqj.js";import{o}from"./site-3q9e2x8k.js";class nm extends Ye{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",P),this.index=this.registerDataInput("index",P,new He(-1)),this.value=this.registerDataOutput("value",P)}_updateOutputs(e){let r=this.array.getValue(e),t=ai(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function om(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",nm)}om();
export{nm,om};

//# debugId=CF43B9FB41166F9064756E2164756E21
//# sourceMappingURL=site-zt353t5w.js.map
