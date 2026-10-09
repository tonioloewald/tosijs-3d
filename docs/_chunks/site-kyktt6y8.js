import{Ye,ai}from"./site-bj6vxf7c.js";import{We,I}from"./site-2dj95bre.js";import{o}from"./site-b826ahhk.js";class am extends Ye{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",I),this.index=this.registerDataInput("index",I,new We(-1)),this.value=this.registerDataOutput("value",I)}_updateOutputs(e){let r=this.array.getValue(e),t=ai(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function lm(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",am)}lm();
export{am,lm};

//# debugId=1E341618175E760264756E2164756E21
//# sourceMappingURL=site-kyktt6y8.js.map
