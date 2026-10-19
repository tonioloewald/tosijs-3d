import{Ye,ai}from"./site-rg764awy.js";import{He,P}from"./site-eg49xxv2.js";import{o}from"./site-wv18jmj5.js";class nm extends Ye{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",P),this.index=this.registerDataInput("index",P,new He(-1)),this.value=this.registerDataOutput("value",P)}_updateOutputs(e){let r=this.array.getValue(e),t=ai(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function om(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",nm)}om();
export{nm,om};

//# debugId=CF43B9FB41166F9064756E2164756E21
//# sourceMappingURL=site-v5yy69k0.js.map
