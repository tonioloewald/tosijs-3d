import{$e,ci}from"./site-x0v5x8t1.js";import{Ye,w}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Sm extends $e{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",w),this.index=this.registerDataInput("index",w,new Ye(-1)),this.value=this.registerDataOutput("value",w)}_updateOutputs(e){let r=this.array.getValue(e),t=ci(this.index.getValue(e));if(r&&t>=0&&t<r.length)this.value.setValue(r[t],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var a=!1;function Tm(){if(a)return;a=!0,o("FlowGraphArrayIndexBlock",Sm)}Tm();
export{Sm,Tm};

//# debugId=087CEC9F4F81489A64756E2164756E21
//# sourceMappingURL=site-hygh76am.js.map
