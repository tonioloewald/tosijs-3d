import{Ye,oi}from"./site-5tw2831p.js";import{He,I}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class vm extends Ye{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",I),this.index=this.registerDataInput("index",I,new He(-1)),this.value=this.registerDataOutput("value",I)}_updateOutputs(e){let r=this.array.getValue(e),t=oi(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var i=!1;function bm(){if(i)return;i=!0,a("FlowGraphArrayIndexBlock",vm)}bm();
export{vm,bm};

//# debugId=C6B01C48E87C340D64756E2164756E21
//# sourceMappingURL=site-aj62d3w6.js.map
