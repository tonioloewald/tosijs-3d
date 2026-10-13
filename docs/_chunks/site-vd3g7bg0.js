import{Ye,ai}from"./site-4jsq7n1s.js";import{We,P}from"./site-9sh5dtm0.js";import{o}from"./site-zrw6ygjx.js";class am extends Ye{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",P),this.index=this.registerDataInput("index",P,new We(-1)),this.value=this.registerDataOutput("value",P)}_updateOutputs(e){let r=this.array.getValue(e),t=ai(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function lm(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",am)}lm();
export{am,lm};

//# debugId=895D56267698A77064756E2164756E21
//# sourceMappingURL=site-vd3g7bg0.js.map
